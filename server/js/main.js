
var fs = require('fs');
var Metrics = require('./metrics');
var Player = require('./player');

function main(config) {
  var ws = require('./ws');
  var WorldServer = require('./worldserver');
  var Log = require('log');
  var _ = require('underscore');
  var server = new ws.MultiVersionWebsocketServer(config.port);
  var metrics = config.metricsEnabled ? new Metrics(config) : null;
  var worlds = [];
  var lastTotalPlayers = 0;

  setInterval(function () {
    if (metrics && metrics.isReady) {
      metrics.getTotalPlayers(function (totalPlayers) {
        if (totalPlayers !== lastTotalPlayers) {
          lastTotalPlayers = totalPlayers;
          _.each(worlds, function (world) {
            world.updatePopulation(totalPlayers);
          });
        }
      });
    }
  }, 1000);

  switch (config.debugLevel) {
  case 'error':
    log = new Log(Log.ERROR); break;
  case 'debug':
    log = new Log(Log.DEBUG); break;
  case 'info':
    log = new Log(Log.INFO); break;
  }

  log.info('Starting BrowserQuest game server...');

  server.onConnect(function (connection) {
    var world; // the one in which the player will be spawned
    var connect = function () {
      if (world) {
        world.connectCallback(new Player(connection, world));
      }
    };

    if (metrics) {
      metrics.getOpenWorldCount(function (openWorldCount) {
        // choose the least populated world among open worlds
        world = _.min(_.first(worlds, openWorldCount), function (w) { return w.playerCount; });

        connect();
      });
    } else {
      // simply fill each world sequentially until they are full
      world = _.detect(worlds, function (world) {
        return world.playerCount < config.nbPlayersPerWorld;
      });

      world.updatePopulation();
      connect();
    }
  });

  server.onError(function () {
    log.error(Array.prototype.join.call(arguments, ', '));
  });

  var onPopulationChange = function () {
    metrics.updatePlayerCounters(worlds, function (totalPlayers) {
      _.each(worlds, function (world) {
        world.updatePopulation(totalPlayers);
      });
    });

    metrics.updateWorldDistribution(getWorldDistribution(worlds));
  };

  _.each(_.range(config.nbWorlds), function (i) {
    var world = new WorldServer('world' + (i + 1), config.nbPlayersPerWorld, server);
    world.run(config.mapFilepath);
    worlds.push(world);
    if (metrics) {
      world.onPlayerAdded(onPopulationChange);
      world.onPlayerRemoved(onPopulationChange);
    }
  });

  server.onRequestStatus(function () {
    return JSON.stringify(getWorldDistribution(worlds));
  });

  if (config.metricsEnabled) {
    metrics.ready(function () {
      onPopulationChange(); // initialize all counters to 0 when the server starts
    });
  }

  process.on('uncaughtException', function (e) {
    log.error('uncaughtException: ' + e);
  });
}

function getWorldDistribution(worlds) {
  var distribution = [];

  _.each(worlds, function (world) {
    distribution.push(world.playerCount);
  });

  return distribution;
}

function getConfigFile(path, callback) {
  fs.readFile(path, 'utf8', function (err, jsonString) {
    if (err) {
      console.error('Could not open config file:', err.path);
      callback(null);
    } else {
      callback(JSON.parse(jsonString));
    }
  });
}

var defaultConfigPath = './server/config.json';
var customConfigPath = './server/config_local.json';

process.argv.forEach(function (val, index) {
  if (index === 2) {
    customConfigPath = val;
  }
});

getConfigFile(defaultConfigPath, function (defaultConfig) {
  getConfigFile(customConfigPath, function (localConfig) {
    if (localConfig) {
      main(localConfig);
    } else if (defaultConfig) {
      main(defaultConfig);
    } else {
      console.error('Server cannot start without any configuration file.');
      process.exit(1);
    }
  });
});
