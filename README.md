<!-- [![Build Status](https://travis-ci.org/jfromaniello/passport.socketio.svg)](https://travis-ci.org/jfromaniello/passport.socketio) -->

# koa-socket-passport

Koa 2 port of [passport.socketio].
Access [passport.js] user from [socket.io] in Koa 2.

---

>**Note**:
Still a work in progress.
Complete functionality of the original passport.socketio, like additional methods (filterSocketsByUser) and CORS related stuff still a todo. (PRs welcome!)

---


## Installation
```
npm install koa-socket-passport
```

## Example usage
```javascript
import Koa           from 'koa' // Koa 2 (Koa 1.x *not* supported)

import convert       from 'koa-convert'
import bodyParser    from 'koa-bodyparser'
import session       from 'koa-generic-session'
import MongoStore    from 'koa-generic-session-mongo'

import IO            from 'koa-socket'
import passport      from 'koa-passport'
import { authorize } from 'koa-socket-passport'

const app   = new Koa();
const io    = new IO();
const store = new MongoStore();

io.attach(app);
io.use(authorize({
  key     : 'koa.sid',
  secret  : app.keys,
  store   : store,
  success : onAuthorizeSuccess,
  fail    : onAuthorizeFail,
}));

io.on('connection', function(ctx) {
  var socket = ctx.socket;
  var user = ctx.user;
});

io.on('msg', ({ data, user, socket }) => {
  log(`${user.name} received ${data}`);
  socket.emit('ok');
});
```

## Options

### `store` [function] **required**:
One of [koa-generic-session]. Be sure to use the same store, secret, and keys as in Koa session.

### `key` [string] **optional**:
Defaults to `'koa.sid'`.

### `secret` [string] **optional**:
Defaults to `null`.

### `passport` [function] **optional**:
Defaults to `require('koa-passport')`.

---

>**Note**:
The following `success` and `fail` functions are slightly different from original passport.socketio. Instead of using callbacks to accept/reject the connection, they're now promise based to be more inline with Koa 2's promise/async-await approach.

---

### `success(ksp)` [function] **optional**:
Called everytime an *authorized* user successfuly connects.

Takes one parameter:

  * `ksp` which contains user-information from passport, as well as koaSocketPassport related data. (like cookie, sid, session, etc)

You can return normally here to accept the connection (default behavior), or throw an error (or return a promise that migh get rejected) to reject the connection.

```javascript
function onAuthorizeSuccess(ksp) {
  var user = ksp.user;
  var session = ksp.session;
  if (user.banned) throw new Error('sorry you have been banned');
}
```

### `fail(err, ksp)` [function] **optional**:
Called when something goes wrong or the user couldn't be authorized.

Takes two parameters:

  * `err` contains the error, and has an `err.critical` property which if `true` means that something went wrong, but if `false` it just means that user couldn't be authorized.

  * `ksp` contains the same info as described above in the `success` function. In case of a critical error you can tell by how much info was gathered inside `ksp` where exactly did it fail.

You can throw an error here (or return a promise that might fail) to reject the connection (default behavior), or you can return normally and the connection won't be rejected, although there may not be a `.user` property on the socket. (you can add another middleware and attach one yourself)

By default, if the error was critical the connection is rejected, otherwise not.

```javascript
function onAuthorizeFail(err, ksp){
  if (err.critical)
    throw error('Socket Authorization Failed. ', err.critical, err);
}
```

## `socket.user`
If the user was found and authorized, a `user` property will be available on socket or ctx
```
io.on('connection', function(socket){
  if(socket.user) {
    // ...
  }
})
```
In koa-socket it'll be available as `ctx.user`
```
app.io.on('msg', ctx => {
  if(ctx.user) {
    // ...
  }
});
```


## Additional methods (todo: not ported yet, don't know if they still work)

### `passportSocketIo.filterSocketsByUser`
This function gives you the ability to filter all connected sockets via a user property. Needs two parameters `function(io, function(user))`. Example:
```javascript
passportSocketIo.filterSocketsByUser(io, function(user){
  return user.gender === 'female';
}).forEach(function(socket){
  socket.emit('messsage', 'hello, woman!');
});
```

## CORS-Workaround:
If you happen to have to work with Cross-Origin-Requests (marked by socket.io v0.9 as `handshake.xdomain` and by socket.io v1.0 as `request.xdomain`) then here's a workaround:

### Clientside:
You have to provide the session-cookie. If you haven't set a name yet, do it like this: `app.use(express.session({ key: 'your.sid-key' }));`
```javascript
// Note: ther's no readCookie-function built in.
// Get your own in the internetz
socket = io.connect('//' + window.location.host, {
  query: 'session_id=' + readCookie('your.sid-key')
});
```

### Serverside:
Nope, there's nothing to do on the server side. Just be sure that the cookies names match.


## Notes:
* Does **NOT** support cookie-based sessions. eg: `express.cookieSession`
* If the connection fails, check if you are requesting from a client via CORS. Check `socket.handshake.xdomain === true` (`socket.request.xdomain === true` with socket.io v1) as there are no cookies sent. For a workaround look at the code above.


## Contribute
You are always welcome to open an issue or provide a pull-request!
Also check out the unit tests:
```bash
npm test
```

## License
Licensed under the MIT-License.
2012-2013 José F. Romaniello.



[passport.socketio]: https://github.com/jfromaniello/passport.socketio
[passport.js]: http://passportjs.org
[socket.io]: http://socket.io

[koa-generic-session]: https://github.com/koajs/generic-session

