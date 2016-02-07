/*
  The middleware that does the actualy task of finding/authorizing passport user
*/

var Cookie = require('cookie');
var co = require('co');
var get = require('lodash/get');

var error = require('./error-helper');

module.exports = middleware;


function middleware(ctx) {
  /*
    ctx (for koa-socket) or socket (for plain socket.io), doesn't really matter
  */

  // retrieve the options `io.use(authorize(kspOptions))`
  var ksp = ctx.__koaSocketPassport;
  // Every subsequent step tries to store the relevant info/object in this object
  // It will eventually be passed onto onAuthorizeSuccess/Fail

  return Promise.resolve(ctx).
  then  (ctx     => getCookie   (ksp, ctx)).
  then  (cookie  => getSid      (ksp, cookie, ksp.key)).
  then  (sid     => getSession  (ksp, ksp.store, 'koa:sess:' + sid)).
  then  (session => getUserKey  (ksp, session, ksp.passport._key, ksp.userProperty)).
  then  (userKey => getUser     (ksp, ksp.passport, userKey, ctx)).
  then  (user    => attachUser  (ksp, ctx, user, ksp.userProperty)).
  then  (ctx     => ksp.success (ksp)).
  catch (err     => ksp.fail    (err, ksp));
}

function getCookie(ksp, ctx) {
  var cookie = false ||
    get(ctx, 'socket.socket.handshake.headers.cookie') || // for koa-socket
    get(ctx, 'handshake.headers.cookie') || // for plain socket.io
    false;
  if (!cookie) throw error('Cookie not found', true);
  ksp.cookie = cookie;
  return cookie;
}

function getSid(ksp, cookie, key) {
  try {
    var sid = Cookie.parse(cookie)[key];
  } catch (err) {
    throw error('Error getting sid from cookie', true, err);
  }
  if (!sid) throw error('Couldn\'t get sid from cookie', true);
  ksp.sid = sid;
  return sid;
}

function getSession(ksp, store, key) {
  if (!store) throw error('Store undefined', true);
  if (!store.get) throw error('Store doesn\'t have a `get` function', true);

  // I'm only prepared for koa-generic-session here
  // it yields a generator (which requires co)

  return co(function*() {
    try {
      var session = yield store.get(key);
    } catch (err) {
      throw error('Error getting session from store. ', true, err);
    }
    return session;
  }).catch(err => {
    throw error('Error in session store. ', true, err);
  }).then(session => {
    if (!session)
      throw error('No session found', true);
    ksp.session = session;
    return session;
  });
}

function getUserKey(ksp, session, passportKey, userProperty) {
  try {
    var passportSession = session[passportKey];
  } catch (err) {
    throw error('Error getting passport session. ', true, err);
  }
  if (!passportSession)
    throw error('Passport session not found', true);
  try {
    var userKey = passportSession[userProperty];
  } catch (err) {
    throw error('Error getting User Property from passport session. ', true, err);
  }
  if (!userKey)
    throw error('User not found in session (user not authorized through passport)', false);
  ksp.userKey = userKey;
  return userKey;
}

function getUser(ksp, passport, userKey, ctx) {
  return new Promise(function(resolve, reject) {
    // passport.deserializeUser's *other* signature which actually goes through
    // previously passed deserializing functions and tried to get the user back
    passport.deserializeUser(userKey, ctx, (err, user) => {
      if (err)
        return reject(error('Passport deserializeUser error: ', true, err));
      else if (!user)
        return reject(error('Passport deserializeUser error: User not found', true));
      ksp.user = user;
      resolve(user);
    });
  });
}

function attachUser(ksp, ctx, user, userProperty) {
  ctx[userProperty] = user;
  return ctx;
}
