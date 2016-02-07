/*
  Creates a new Error from "message"
  attaches a .critical property if passed
  If an existing error is passed, it uses that error
    and prepends the new message before it's original message
*/

module.exports = error;

function error(message, critical, existingError) {
  var err = existingError || new Error('');
  err.message = message + err.message;
  err.critical = critical;
  return err;
}
