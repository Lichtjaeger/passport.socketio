
/*
  Todo: does this still work?
*/

module.exports = filterSocketsByUser;

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
