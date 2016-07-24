
var Class = require('./lib/class');
var fs = require('fs');
var _ = require('underscore');
var Utils = require('./utils');
var Checkpoint = require('./checkpoint');
var Log = require('log');
var log = new Log();

var MapClass = Class.extend({
  init: function (filepath, callback) {
    var self = this;

    this.isLoaded = false;

    fs.exists(filepath, function (exists) {
      if (!exists) {
        var error = filepath + ' doesn\'t exist.';
        log.error(error);
        return callback(error);
      }

      fs.readFile(filepath, function (err, file) {
        if (err) {
          return callback(err);
        }

        try {
          var json = JSON.parse(file.toString());
        } catch (ex) {
          var error = 'Could not parse JSON file: ' + filepath;
          log.error(error);
          return callback(error);
        }

        self.initMap(json);
        callback();
      });
    });
  },

  initMap: function (map) {
    this.width = map.width;
    this.height = map.height;
    this.collisions = map.collisions;
    this.mobAreas = map.roamingAreas;
    this.chestAreas = map.chestAreas;
    this.staticChests = map.staticChests;
    this.staticEntities = map.staticEntities;
    this.isLoaded = true;

    // zone groups
    this.zoneWidth = 28;
    this.zoneHeight = 12;
    this.groupWidth = Math.floor(this.width / this.zoneWidth);
    this.groupHeight = Math.floor(this.height / this.zoneHeight);

    this.initConnectedGroups(map.doors);
    this.initCheckpoints(map.checkpoints);
  },

  tileIndexToGridPosition: function (tileNum) {
    var x = 0;
    var y = 0;

    var getX = function (num, w) {
      if (num == 0) {
        return 0;
      }

      return (num % w == 0) ? w - 1 : (num % w) - 1;
    };

    tileNum -= 1;
    x = getX(tileNum + 1, this.width);
    y = Math.floor(tileNum / this.width);

    return { x: x, y: y };
  },

  gridPositionToTileIndex: function (x, y) {
    return (y * this.width) + x + 1;
  },

  // TODO this is a very inefficient method, it takes about 2.7 seconds
  // to run, refactor or remove. Possible soluton, use gridPositionToTileIndex
  // and only loop through collisions.
  generateCollisionGrid: function () {
    this.grid = [];

    if (!this.isLoaded) { return; }

    var tileIndex = 0;
    for (var j, i = 0; i < this.height; i++) {
      this.grid[i] = [];
      for (j = 0; j < this.width; j++) {
        if (_.include(this.collisions, tileIndex)) {
          this.grid[i][j] = 1;
        } else {
          this.grid[i][j] = 0;
        }

        tileIndex += 1;
      }
      //log.info("Collision grid generated.");
    }
  },

  isOutOfBounds: function (x, y) {
    return x <= 0 || x >= this.width || y <= 0 || y >= this.height;
  },

  isColliding: function (x, y) {
    if (this.isOutOfBounds(x, y)) {
      return false;
    }

    return this.grid[y][x] === 1;
  },

  groupIdToGroupPosition: function (id) {
    var posArray = id.split('-');

    return pos(parseInt(posArray[0]), parseInt(posArray[1]));
  },

  forEachGroup: function (callback) {
    var width = this.groupWidth;
    var height = this.groupHeight;

    for (var x = 0; x < width; x += 1) {
      for (var y = 0; y < height; y += 1) {
        callback(x + '-' + y);
      }
    }
  },

  getGroupIdFromPosition: function (x, y) {
    var w = this.zoneWidth;
    var h = this.zoneHeight;
    var gx = Math.floor((x - 1) / w);
    var gy = Math.floor((y - 1) / h);

    return gx + '-' + gy;
  },

  getAdjacentGroupPositions: function (id) {
    var self = this;
    var position = this.groupIdToGroupPosition(id);
    var x = position.x;
    var y = position.y;
    // surrounding groups
    var list = [
      pos(x - 1, y - 1),
      pos(x, y - 1),
      pos(x + 1, y - 1),
      pos(x - 1, y),
      pos(x, y),
      pos(x + 1, y),
      pos(x - 1, y + 1),
      pos(x, y + 1),
      pos(x + 1, y + 1)
    ];

    // groups connected via doors
    _.each(this.connectedGroups[id], function (position) {
      // don't add a connected group if it's already part of the surrounding ones.
      if (!_.any(list, function (groupPos) { return equalPositions(groupPos, position); })) {
        list.push(position);
      }
    });

    return _.reject(list, function (pos) {
      return pos.x < 0 || pos.y < 0 || pos.x >= self.groupWidth || pos.y >= self.groupHeight;
    });
  },

  forEachAdjacentGroup: function (groupId, callback) {
    if (groupId) {
      _.each(this.getAdjacentGroupPositions(groupId), function (pos) {
        callback(pos.x + '-' + pos.y);
      });
    }
  },

  initConnectedGroups: function (doors) {
    var self = this;

    this.connectedGroups = {};
    _.each(doors, function (door) {
      var groupId = self.getGroupIdFromPosition(door.x, door.y),
        connectedGroupId = self.getGroupIdFromPosition(door.tx, door.ty),
        connectedPosition = self.groupIdToGroupPosition(connectedGroupId);

      if (groupId in self.connectedGroups) {
        self.connectedGroups[groupId].push(connectedPosition);
      } else {
        self.connectedGroups[groupId] = [connectedPosition];
      }
    });
  },

  initCheckpoints: function (cpList) {
    var self = this;

    this.checkpoints = {};
    this.startingAreas = [];

    _.each(cpList, function (cp) {
      var checkpoint = new Checkpoint(cp.id, cp.x, cp.y, cp.w, cp.h);
      self.checkpoints[checkpoint.id] = checkpoint;
      if (cp.s === 1) {
        self.startingAreas.push(checkpoint);
      }
    });
  },

  getCheckpoint: function (id) {
    return this.checkpoints[id];
  },

  getRandomStartingPosition: function () {
    var nbAreas = _.size(this.startingAreas);
    var i = Utils.randomInt(0, nbAreas - 1);
    var area = this.startingAreas[i];

    return area.getRandomPosition();
  }
});

var pos = function (x, y) {
  return { x: x, y: y };
};

var equalPositions = function (pos1, pos2) {
  return pos1.x === pos2.x && pos2.y === pos2.y;
};

module.exports = MapClass;
