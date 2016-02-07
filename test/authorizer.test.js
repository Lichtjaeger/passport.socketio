var fixture = require('./fixture');
var request = require('request');
var setSocketIOHandshakeCookies = require('./fixture/setSocketIOHandshakeCookies');

var io = require('socket.io-client');

var dummyUser = require('./dummy-user');

describe('authorizer', function() {

  //start and stop the server
  before(fixture.start);
  after(fixture.stop);

  //create a new session for every test
  beforeEach(function() {
    this.cookies = request.jar();
    setSocketIOHandshakeCookies(this.cookies);
  });


  describe('when the user is not logged in', function() {

    it('should emit error with unauthorized handshake', function(done) {
      var socket = io.connect('http://localhost:9000', { 'force new connection': true });
      socket.on('error', function(err) {
        err.should.be.an.Error;
        done();
      });
    });

  });

  describe('when the user is logged in', function() {
    this.timeout(20000)
    beforeEach(function(done) {
      request.post({
        jar: this.cookies,
        url: 'http://localhost:9000/login',
        form: dummyUser,
      }, done);
    });

    it('should do the handshake and connect', function(done) {
      // console.log('this.cookies:', this.cookies);
      var cookie = this.cookies.cookies.reverse()[1].str;
      // console.log('cookie:', cookie);
      var socket = io.connect('http://localhost:9000', {
        'force new connection': true,
        extraHeaders: { cookie: cookie }
      });
      socket.on('connect', done)
        .on('error', done);
    });

  });

});
