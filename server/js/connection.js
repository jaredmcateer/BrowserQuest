var Class = require('./lib/class');
var Log = require('log');
var log = new Log();

var Connection = Class.extend({
  init: function (id, connection, server) {
    this._connection = connection;
    this._server = server;
    this.id = id;
  },

  onClose: function (callback) {
    this.closeCallback = callback;
  },

  listen: function (callback) {
    this.listenCallback = callback;
  },

  broadcast: function () {
    throw 'Not implemented';
  },

  send: function () {
    throw 'Not implemented';
  },

  sendUTF8: function () {
    throw 'Not implemented';
  },

  close: function (logError) {
    this.log('Closing connection to ' + this._connection.remoteAddress + '. Error: ' + logError);
    this._connection.close();
  },

  log: function (msg) {
    log.info(msg);
  }
});

module.exports = Connection;
