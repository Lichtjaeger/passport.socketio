var xtend = require('xtend');

function parseCookie(auth, cookieHeader) {
  var cookieParser = auth.cookieParser(auth.secret);
  var req = {
    headers:{
      cookie: cookieHeader
    }
  };
  var result;
  cookieParser(req, {}, function (err) {
    if (err) throw err;
    result = req.signedCookies || req.cookies;
  });
  return result;
}

function authorize(options) {
  var defaults = {
    passport:     require('passport'),
    key:          'connect.sid',
    secret:       null,
    store:        null,
    userProperty: 'user',
    success:      function (data, accept){
      if (data.socketio_version_1) {
        accept();
      } else {
        accept(null, true);
      }
    },
    fail:         function (data, message, critical, accept) {
      if (data.socketio_version_1) {
        accept(new Error(message));
      } else {
        accept(null, false);
      }
    }
  };

  var auth = xtend(defaults, options);

  if (!auth.cookieParser) {
    try {
      auth.cookieParser = require('cookie-parser');
    } catch (err) {
      throw new Error('cookieParser is required use require(\'cookie-parser\'), connect.cookieParser or express.cookieParser');
    }
  }

  function logIn(user, done) {
    var data = this;
    auth.store.get(data.sessionID, function (err, session) {
      if (err || !session) {
        return done && done("Error in session store: " + (err ? err.message : "No session found"));
      }
      auth.passport.serializeUser(user, function(err, userKey) {
        if (err) return done && done(err);
        try {
          if (!session[auth.passport._key]) session[auth.passport._key] = {}
          session[auth.passport._key][auth.userProperty] = userKey;
        } catch (e) {
          return done && done("Failed to save");
        }
        auth.store.set(data.sessionID, session, function (err) {
          if (!err) {
            data[auth.userProperty] = user;
            data[auth.userProperty].logged_in = true;
          }
          done && done(err);
        });
      });
    });
  }
  function logOut(done) {
    var data = this;
    auth.store.get(data.sessionID, function (err, session) {
      if (err || !session) {
        return done && done("Error in session store: " + (err ? err.message : "No session found"));
      }
      try {
        delete session[auth.passport._key][auth.userProperty];
        delete data[auth.userProperty];
      } catch (e) {
        return done && done("Failed to delete");
      }
      auth.store.set(data.sessionID, session, function (err) {
        if (!err) {
          data[auth.userProperty] = {};
          data[auth.userProperty].logged_in = false;
        }
        done && done(err);
      });
    });
  }

  return function(data, accept){

    if(auth.saveSocketId){
      try {
        var sockId = data.conn.id;
      } catch (e) {

      }
    }
    // socket.io v1.0 now provides socket handshake data via `socket.request`
    if (data.request) {
      data = data.request;
      data.socketio_version_1 = true;
    }

    data.logIn = data.login = logIn;
    data.logOut = data.logout = logOut;
    data.cookie = parseCookie(auth, data.headers.cookie || '');
    data.sessionID = (data.query && data.query.session_id) || (data._query && data._query.session_id) || data.cookie[auth.key] || '';
    data[auth.userProperty] = {
      logged_in: false
    };

    if(data.xdomain && !data.sessionID)
      return auth.fail(data, 'Can not read cookies from CORS-Requests. See CORS-Workaround in the readme.', false, accept);

    auth.store.get(data.sessionID, function(err, session){
      if(err)
        return auth.fail(data, 'Error in session store:\n' + err.message, true, accept);
      if(!session)
        return auth.fail(data, 'No session found', false, accept);
      if(!session[auth.passport._key])
        return auth.fail(data, 'Passport was not initialized', false, accept);

      var userKey = session[auth.passport._key].user;

      if(auth.saveSocketId){
        session[auth.socketIdKey]=sockId;
        try {
          auth.store.set(data.sessionID, session, function (err, fdata) {
            if(err)
              return auth.fail(data, 'Failed to save SocketId', false, accept);
          });
        } catch (e) {
            return auth.fail(data, 'User not authorized through passport. (User Property not found)', false, accept);
        }

      }
      if(typeof(userKey) === 'undefined')
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

    });
  };
}

function filterSocketsByUser(socketIo, filter){
  var handshaken = [];
  for ( var i in socketIo.sockets.connected )
    if ( socketIo.sockets.connected[i].handshake )
        handshaken.push( socketIo.sockets.connected[i] )

  return Object.keys(handshaken || {})
    .filter(function(skey){
      return filter(handshaken[skey].conn.request.user);
    })
    .map(function(skey){
      return handshaken[skey];
    });
}

exports.authorize = authorize;
exports.filterSocketsByUser = filterSocketsByUser;
