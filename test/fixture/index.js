const http = require('http');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser')
const passport = require('koa-passport')
const MemoryStore = require('koa-generic-session').MemoryStore;
const SocketIo = require('socket.io');
const convert = require('koa-convert');
const session = require('koa-generic-session');
const Router = require('koa-router');
const extend = require('lodash/extend');

const koaSocketPassport = require('../../lib');

const secret = 'asdasdsdas1312312';
// const key = 'koa.sid';
const store = new MemoryStore();

var defaults = {
  store: store,
  // key: key,
  secret: secret,
  saveUninitialized: true,
  resave: true
};

var server;

const setupPassport = require('./setup-passport');

exports.start = function(options, callback) {

  if (typeof options == 'function') {
    callback = options;
    options = {};
  }

  var app = new Koa();

  app.use(convert(bodyParser()));
  app.keys = [secret];
  app.use(convert(session(defaults)));
  app.use(passport.initialize());
  app.use(passport.session(defaults));

  setupPassport(passport);

  var router = new Router();
  router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
  }));
  // router.post('/login', (ctx, next) => {
  //   console.log('login?');
  //   // clearTimeout(x);
  //   var x = setTimeout(function() {
  //     console.log('ctx.session:', ctx.session);
  //   }, 1000);
  //   passport.authenticate('local', {
  //     successRedirect: '/',
  //     failureRedirect: '/login',
  //     failureFlash: true
  //   })(ctx, function() {
  //     console.log('hey');
  //     next();
  //   })
  // });
  router.get('/', (ctx, next) => {
    if (!ctx.user) {
      ctx.status = 401;
    } else {
      ctx.json(ctx.user);
    }
  });
  app.use(router.routes());

  server = http.createServer(app.callback());

  var io = SocketIo(server);
  // io.use(function(socket, next) {
  //   console.log('socket:', socket);
  //   // next(new Error('handshake unauthorized'));
  //   // console.log('even1');
  //   next();
  // });
  io.use(koaSocketPassport.authorize(extend({}, defaults, options)));
  // io.use(function() {
  //   console.log('even2');
  // });
  io.sockets.on('echo', function(m) {
    io.sockets.emit('echo-response', m);
  });

  server.listen(9000, callback);
};

exports.stop = function(callback) {
  server.close();
  callback();
};
