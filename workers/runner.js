'use strict';

const flatten = require('flat');
const database = require('mssql');

const dbConfig = {
  user: process.env.CSADB_USER,
  password: process.env.CSADB_PASSWORD,
  server: process.env.CSADB_SERVER,
  database: process.env.CSADB_DATABASE,
  requestTimeout: 30000,
};
const connection = database.connect(dbConfig);

function prepareTable(name, db, cols) {
  const table = new db.Table(name);
  table.create = true;

  cols.forEach((col) => {
    if (col === 'id') table.columns.add(col, db.NVarChar(250), { nullable: false, primary: true });
    else table.columns.add(col, db.NVarChar(db.MAX), { nullable: true });
  });

  return table;
}

function handleSave(table, data) {
  return connection
    .then(() => {
      data.forEach((row) => {
        const flatRow = flatten(row);
        const values = Object.keys(flatRow).map(key => flatRow[key]);
        table.rows.add(...values);
      });

      return new database.Request().bulk(table);
    })
    .then(() => data.map(row => row.id))
    .catch(error => ({ error, source: 'handleSave' }));
}

function makeGenerator({ config, data, handlers }) {
  const { origin, list, size } = config;
  const { input, model, todo, done } = data;
  const { handleGet, handleResponse } = handlers;

  const tableName = `ibc_seg.DM_SOURCE_${origin.toUpperCase()}_${list.toUpperCase()}_RAW`;
  const maxRetries = 3;
  let retries = 0;
  let message = 'Getting';
  let progress = Math.floor(done.length / input.length * 100 / size);

  return function *gen() {
    if (process.send) process.send({ type: 'start', origin, list });
    if (!process.send) {
      console.log(`Start: ${origin}_${list}`);
      console.log(`Remaining: ${todo.length}`);
    }

    while (todo.length) {
      const item = todo.shift();
      if (!process.send) process.stdout.write(`${message} ${item.name}`);

      try {
        const response = yield handleGet(item);
        if (response.source) throw response;

        const results = yield handleResponse(item, response, done);
        if (results.source) throw results;

        const table = prepareTable(tableName, database, Object.keys(flatten(model)));
        const inserted = yield handleSave(table, results);
        if (inserted.source) throw inserted;

        done.push(...inserted);
        retries = 0;
        message = 'Getting';
        const newProgress = Math.floor(done.length / input.length * 100 / size);

        if (!process.send) console.log(` -> results: ${results.length} -> OK`);
        if (newProgress > progress) {
          progress = newProgress;
          if (process.send) process.send({ type: 'progress', data: progress, origin, list });
        }
      } catch (error) {
        if (!process.send) {
          console.log(' -> ERROR');
          console.log(error);
        }
        if (retries < maxRetries) {
          retries += 1;
          message = `Retrying (attempt ${retries})`;
          todo.unshift(item);
        } else {
          if (process.send) process.send({ type: 'error', data: error, origin, list });
          if (!process.send) console.log('Reached maximum number of retry attempts.');
          break;
        }
      }
    }

    if (process.send) process.send({ type: 'stop', origin, list });
    if (!process.send) console.log(`Done: ${name}`);
  };
}

function run({ config, data, handlers }) {
  const gen = makeGenerator({ config, data, handlers });
  const it = gen();

  (function pull(val) {
    const ret = it.next(val);
    if (!ret.done) {
      Promise
      .resolve(ret.value)
      .then(pull)
      .catch(error => pull({ error, source: 'runner' }));
    }
  }());
}

function runner({ config, data, handlers }) {
  const { origin, list } = config;
  const { input, model } = data;
  const tableName = `ibc_seg.DM_SOURCE_${origin.toUpperCase()}_${list.toUpperCase()}_RAW`;

  connection

  // create table
  .then(() => {
    const table = prepareTable(tableName, database, Object.keys(flatten(model)));
    return new database.Request().bulk(table);
  })

  // get progress
  .then(() => {
    // FIXME:
    // if centroide has 0 unique values no records will be saved and
    // we won't know that it has already been done
    const pClusters = new database.Request()
      .query(`
        SELECT distinct id
        FROM ${tableName}
        WHERE DATEDIFF(day, [datetime], '${new Date().toISOString()}') < 30
      `);
    const pIds = new database.Request()
      .query(`
        SELECT distinct id
        FROM ${tableName}
        WHERE DATEDIFF(day, [datetime], '${new Date().toISOString()}') < 30
      `);

    return Promise.all([pClusters, pIds]);
  })

  // start runner
  .then((values) => {
    const clustersDone = values[0].map(item => item.cluster);
    const idsDone = values[1].map(venue => venue.id);
    const clustersTodo = input.filter(item => clustersDone.indexOf(item.cluster) === -1);

    data.done = idsDone;
    data.todo = clustersTodo;

    run({ config, data, handlers });
  })
  .catch(err => console.log(err));
}

module.exports = runner;
