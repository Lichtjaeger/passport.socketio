/*
  koaSocketPassport.authorize()

  Creates the middleware for io which will be responsible
  for finding and authorizing the passport user.

  Usage: io.use(koaSocketPassport.authorize())

*/


var extend = require('lodash/extend');
const passport = require('koa-passport')

var middleware = require('./middleware');
var error = require('./error-helper');

module.exports = authorize;

var defaults = {
  passport: passport,
  key: 'koa.sid',
  secret: null,
  store: null,
  success: onAuthorizeSuccess,
  fail: onAuthorizeFail,
};

function authorize(opts) {
  opts = extend({}, defaults, opts);

  opts.userProperty = opts.passport._userProperty || 'user';

  if (!opts.store)
    throw new Error('Need a store');

  /*
    The io.use(middleware) function (just a wrapper)
    The actual function that does the job is the middleware function
    This just calls that, and after it finishes, calls next.
    This stores the options in a private proeprty and passed it to the middleware function
  */
  return function koaSocketPassportMiddleware(ctx, next) {
    ctx.__koaSocketPassport = opts;
    return middleware(ctx).then(next).catch(next);
  };
}

function onAuthorizeSuccess(ksp) {
  // console.log('ksp:', ksp);
  /* ctx.user can be modified here */
}

function onAuthorizeFail(err, ksp) {
  // console.log('ksp:', ksp);
  if (err.critical)
    throw error('Socket Authorization Failed. ', err.critical, err);
}
