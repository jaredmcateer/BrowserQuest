var Class = require('./lib/class');
var _ = require('underscore');

var Server = Class.extend({
  init: function (port) {
    this.port = port;
  },

  onConnect: function (callback) {
    this.connectionCallback = callback;
  },

  onError: function (callback) {
    this.errorCallback = callback;
  },

  broadcast: function () {
    throw 'Not implemented';
  },

  forEachConnection: function (callback) {
    _.each(this._connections, callback);
  },

  addConnection: function (connection) {
    this._connections[connection.id] = connection;
  },

  removeConnection: function (id) {
    delete this._connections[id];
  },

  getConnection: function (id) {
    return this._connections[id];
  }
});

module.exports = Server;
