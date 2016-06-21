'use strict';

(function iife($, io) {
  function setButtonState(buttons) {
    buttons.forEach(function (button) {
      return button.state === 'disabled' ? button.element.addClass('disabled') : button.element.removeClass('disabled');
    });
  }
  function setProgressState(element, state) {
    element.attr('aria-valuenow', state);
    element.attr('aria-valuetext', state + ' percent');
    element.find('.progress-meter').width(state + '%');
    element.find('.progress-meter-text').text(state + '%');
  }

  fetch('./api/v1/token', { credentials: 'same-origin' }).then(function (response) {
    return response.text();
  }).then(function (token) {
    var socket = io({
      query: 'token=' + token
    });
    socket.on('connect', function () {
      // FOURSQUARE
      var updateFoursquare = $('.foursquare .update');
      var stopFoursquare = $('.foursquare .stop');
      var progressFoursquare = $('.foursquare .progress');

      updateFoursquare.on('click', function (e) {
        e.preventDefault();
        socket.emit('foursquare_start');
      });
      stopFoursquare.on('click', function (e) {
        e.preventDefault();
        socket.emit('foursquare_stop');
      });

      socket.on('foursquare_start', function () {
        setButtonState([{ element: updateFoursquare, state: 'disabled' }, { element: stopFoursquare, state: '' }]);
      });
      socket.on('foursquare_stop', function () {
        setButtonState([{ element: updateFoursquare, state: '' }, { element: stopFoursquare, state: 'disabled' }]);
      });
      socket.on('foursquare_progress', function (data) {
        setProgressState(progressFoursquare, data);
      });

      // YELP
      var updateYelp = $('.yelp .update');
      var stopYelp = $('.yelp .stop');
      var progressYelp = $('.yelp .progress');

      updateYelp.on('click', function (e) {
        e.preventDefault();
        socket.emit('yelp_start');
      });
      stopYelp.on('click', function (e) {
        e.preventDefault();
        socket.emit('yelp_stop');
      });

      socket.on('yelp_start', function () {
        setButtonState([{ element: updateYelp, state: 'disabled' }, { element: stopYelp, state: '' }]);
      });
      socket.on('yelp_stop', function () {
        setButtonState([{ element: updateYelp, state: '' }, { element: stopYelp, state: 'disabled' }]);
      });
      socket.on('yelp_progress', function (data) {
        setProgressState(progressYelp, data);
      });

      // TWITTER
      var updateTwitter = $('.twitter .update');
      var stopTwitter = $('.twitter .stop');
      var progressTwitter = $('.twitter .progress');

      updateTwitter.on('click', function (e) {
        e.preventDefault();
        socket.emit('twitter_start');
      });
      stopTwitter.on('click', function (e) {
        e.preventDefault();
        socket.emit('twitter_stop');
      });

      socket.on('twitter_start', function () {
        setButtonState([{ element: updateTwitter, state: 'disabled' }, { element: stopTwitter, state: '' }]);
      });
      socket.on('twitter_stop', function () {
        setButtonState([{ element: updateTwitter, state: '' }, { element: stopTwitter, state: 'disabled' }]);
      });
      socket.on('twitter_progress', function (data) {
        setProgressState(progressTwitter, data);
      });

      // FACEBOOK
      var updateFacebook = $('.facebook .update');
      var stopFacebook = $('.facebook .stop');
      var progressFacebook = $('.facebook .progress');

      updateFacebook.on('click', function (e) {
        e.preventDefault();
        socket.emit('facebook_start');
      });
      stopFacebook.on('click', function (e) {
        e.preventDefault();
        socket.emit('facebook_stop');
      });

      socket.on('facebook_start', function () {
        setButtonState([{ element: updateFacebook, state: 'disabled' }, { element: stopFacebook, state: '' }]);
      });
      socket.on('facebook_stop', function () {
        setButtonState([{ element: updateFacebook, state: '' }, { element: stopFacebook, state: 'disabled' }]);
      });
      socket.on('facebook_progress', function (data) {
        setProgressState(progressFacebook, data);
      });
    });
  });
})($, io);