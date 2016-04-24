
var Area = require('./area');
var _ = require('underscore');
var Types = require('../../shared/js/gametypes');
var Mob = require('./mob');
var Utils = require('./utils');

var MobArea = Area.extend({
  init: function (id, nb, kind, x, y, width, height, world) {
    this._super(id, x, y, width, height);
    this.world = world;
    this.nb = nb;
    this.kind = kind;
    this.respawns = [];
    this.setNumberOfEntities(this.nb);

    //this.initRoaming();
  },

  spawnMobs: function () {
    for (var i = 0; i < this.nb; i += 1) {
      this.addToArea(this._createMobInsideArea());
    }
  },

  _createMobInsideArea: function () {
    var k = Types.getKindFromString(this.kind);
    var pos = this._getRandomPositionInsideArea();
    var mob = new Mob('1' + this.id + '' + k + '' + this.entities.length, k, pos.x, pos.y);

    mob.onMove(this.world.onMobMoveCallback.bind(this.world));

    return mob;
  },

  _getRandomPositionInsideArea: function () {
    var pos = {};
    var valid = false;

    while (!valid) {
      pos.x = this.x + Utils.random(this.width + 1);
      pos.y = this.y + Utils.random(this.height + 1);
      valid = this.world.isValidPosition(pos.x, pos.y);
    }

    return pos;
  },

  respawnMob: function (mob, delay) {
    var self = this;

    this.removeFromArea(mob);

    setTimeout(function () {
      var pos = self._getRandomPositionInsideArea();

      mob.x = pos.x;
      mob.y = pos.y;
      mob.isDead = false;
      self.addToArea(mob);
      self.world.addMob(mob);
    }, delay);
  },

  initRoaming: function (delay, forceRoam) {
    var self = this;
    delay = delay || 500;

    this.intervalId = setInterval(function () {
      _.each(self.entities, function (mob) {
        var canRoam = forceRoam || (Utils.random(20) === 1);
        var pos;

        if (canRoam) {
          if (!mob.hasTarget() && !mob.isDead) {
            pos = self._getRandomPositionInsideArea();
            mob.move(pos.x, pos.y);
          }
        }
      });
    }, delay);
  },

  stopRoaming: function () {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  },

  createReward: function () {
    var pos = this._getRandomPositionInsideArea();

    return { x: pos.x, y: pos.y, kind: Types.Entities.CHEST };
  }
});

module.exports = MobArea;
