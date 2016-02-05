var passport = require('passport')
var xtend = require('xtend');
var Cookie = require('cookie');
var co = require('co');

function authorize(options) {
  var defaults = {
    passport: passport,
    key: 'koa.sid',
    secret: null,
    store: null,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail,
  };

  var auth = xtend(defaults, options);

  auth.userProperty = auth.passport._userProperty || 'user';

  if (!auth.cookieParser) {
    try {
      auth.cookieParser = require('cookie-parser');
    } catch (err) {
      throw new Error('cookieParser is required use require(\'cookie-parser\'), connect.cookieParser or express.cookieParser');
    }
  }

  return function*(next) {
    var data = this;
    var accept = next;

    // socket.io v1.0 now provides socket handshake data via `socket.request`
    if (data.request) {
      data = data.request;
      data.socketio_version_1 = true;
    }
    var cookie = data.socket.socket.handshake.headers.cookie;
    var sid = Cookie.parse(cookie)[auth.key];

    data[auth.userProperty] = {
      logged_in: false
    };

    if (data.xdomain && !data.sessionID)
      return auth.fail(data, 'Can not read cookies from CORS-Requests. See CORS-Workaround in the readme.', false, accept);

    try {
      var session = yield auth.store.get('koa:sess:' + sid);
    } catch (err) {
      return auth.fail(data, 'Error in session store:\n' + err.message, true, accept);
    }

    if (!session)
      return auth.fail(data, 'No session found', false, accept);

    if (!session[auth.passport._key])
      return auth.fail(data, 'Passport was not initialized', true, accept);

    var userKey = session[auth.passport._key][auth.userProperty];

    if (typeof(userKey) === 'undefined')
      return auth.fail(data, 'User not authorized through passport. (User Property not found)', false, accept);

    auth.passport.deserializeUser(userKey, data, function(err, user) {
      if (err)
        return auth.fail(data, err, true, accept);
      if (!user)
        return auth.fail(data, "User not found", false, accept);
      data[auth.userProperty] = user;
      data[auth.userProperty].logged_in = true;
      auth.success(data, accept);
    });

  };
}

function onAuthorizeSuccess(data, accept) {
  if (data.socketio_version_1) {
    accept();
  } else {
    accept(null, true);
  }
}

function onAuthorizeFail(data, message, critical, accept) {
  if (data.socketio_version_1) {
    accept(new Error(message));
  } else {
    accept(null, false);
  }
}

function filterSocketsByUser(socketIo, filter) {
  var handshaken = [];
  for (var i in socketIo.sockets.connected)
    if (socketIo.sockets.connected[i].handshake)
      handshaken.push(socketIo.sockets.connected[i])

  return Object.keys(handshaken || {})
    .filter(function(skey) {
      return filter(handshaken[skey].conn.request.user);
    })
    .map(function(skey) {
      return handshaken[skey];
    });
}

exports.authorize = authorize;
exports.filterSocketsByUser = filterSocketsByUser;
