var LocalStrategy = require('passport-local').Strategy;

var dummyUser = require('../dummy-user');
var error = new Error('wrong user name or password');

module.exports = function setupPassport(passport) {
  passport.use(new LocalStrategy(localStrategy));
  passport.serializeUser(serializeUser);
  passport.deserializeUser(deserializeUser);
}

function localStrategy(username, password, done) {
  // console.log('localStrategy', arguments);
  if (username == dummyUser.username && password == dummyUser.password)
    done(null, dummyUser);
  else
    done(error, false, error);
}

function serializeUser(user, done) {
  // console.log('serializeUser', arguments);
  done(null, user.id);
}

function deserializeUser(id, done) {
  // console.log('deserializeUser', arguments);
  if (id == dummyUser.id)
    done(null, dummyUser);
  else
    done(error);
}
