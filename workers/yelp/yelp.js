'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const Yelp = require('yelp');

const run = require('../runner.js');
const model = require('./model.js');

// Set up config objects

const name = 'yelp';
const tableName = 'ibc_seg.DM_SOURCE_YELP_RAW';
const apiConfig = {
  consumer_key: process.env.YELP_CONSUMER_KEY,
  consumer_secret: process.env.YELP_CONSUMER_SECRET,
  token: process.env.YELP_TOKEN,
  token_secret: process.env.YELP_TOKEN_SECRET,
};

// Set up input data

const input = JSON.parse(fs.readFileSync(path.join(__dirname, './input/centroides.json')))
  .map((item) => Object.assign({ latlon: item }, {
    name: item,
    cluster: item,
    section: 'restaurants,nightlife',
  }));

// Set up handlers

function handleGet({ latlon, section }) {
  const yelp = new Yelp(apiConfig);

  return yelp.search({
    offset: 0,
    limit: 20,
    ll: latlon,
    category_filter: section,
    radius_filter: 150,
    sort: 1,
  })
  .catch(error => ({ error, source: 'handleGet' }));
}

function handleResponse(item, response, done) {
  const { cluster, section } = item;
  const datetime = new Date().toISOString();

  if (!response.statusCode) {
    return response.businesses
      .map((row) => {
        // last opoortunity to modify response objects
        const newRow = row;
        return newRow;
      })
      .map((row, index) => _.merge({}, model, row, { cluster, section, index, datetime }))
      .filter(row => done.indexOf(row.id) === -1);
  }

  return { error: response.meta, source: 'handleResponse' };
}

// Run

run({
  config: { name, tableName },
  data: { input, model },
  handlers: { handleGet, handleResponse },
});
