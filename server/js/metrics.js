
var cls = require('./lib/class');
var  _ = require('underscore');

var Metrics = Class.extend({
  init: function (config) {
    var self = this;

    this.config = config;
    this.client = new (require('memcache')).Client(config.memcachedPort, config.memcachedHost);
    this.client.connect();

    this.isReady = false;

    this.client.on('connect', function () {
      log.info('Metrics enabled: memcached client connected to ' + config.memcachedHost + ':' + config.memcachedPort);
      self.isReady = true;
      if (self.readyCallback) {
        self.readyCallback();
      }
    });
  },

  ready: function (callback) {
    this.readyCallback = callback;
  },

  updatePlayerCounters: function (worlds, updatedCallback) {
    var self = this,
      config = this.config,
      numServers = _.size(config.gameServers),
      playerCount = _.reduce(worlds, function (sum, world) { return sum + world.playerCount; }, 0);

    if (this.isReady) {
      // Set the number of players on this server
      this.client.set('playerCount' + config.serverName, playerCount, function () {
        var totalPlayers = 0;

        // Recalculate the total number of players and set it
        _.each(config.gameServers, function (server) {
          self.client.get('playerCount' + server.name, function (error, result) {
            var count = result ? parseInt(result) : 0;

            totalPlayers += count;
            numServers -= 1;
            if (numServers === 0) {
              self.client.set('totalPlayers', totalPlayers, function () {
                if (updatedCallback) {
                  updatedCallback(totalPlayers);
                }
              });
            }
          });
        });
      });
    } else {
      log.error('Memcached client not connected');
    }
  },

  updateWorldDistribution: function (worlds) {
    this.client.set('worldDistribution' + this.config.serverName, worlds);
  },

  getOpenWorldCount: function (callback) {
    this.client.get('worldCount' + this.config.serverName, function (error, result) {
      callback(result);
    });
  },

  getTotalPlayers: function (callback) {
    this.client.get('totalPlayers', function (error, result) {
      callback(result);
    });
  }
});

module.exports = Metrics;
