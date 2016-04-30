
var Class = require('./lib/class');
var _ = require('underscore');
var Utils = require('./utils');

var Area = Class.extend({
  init: function (id, x, y, width, height) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.areaType = 'Area';
    this.world = null;
    this.entities = [];
    this.hasCompletelyRespawned = true;
  },

  removeFromArea: function (entity) {
    var i = _.indexOf(_.pluck(this.entities, 'id'), entity.id);
    this.entities.splice(i, 1);

    if (this.isEmpty() && this.hasCompletelyRespawned && this.emptyCallback) {
      this.hasCompletelyRespawned = false;
      this.emptyCallback();
    }
  },

  addToArea: function (entity) {
    var Mob = require('./mob');
    if (entity) {
      this.entities.push(entity);
      entity.area = this;
      if (entity instanceof Mob) {
        this.world.addMob(entity);
      }
    }

    if (this.isFull()) {
      this.hasCompletelyRespawned = true;
    }
  },

  setNumberOfEntities: function (nb) {
    this.nbEntities = nb;
  },

  isEmpty: function () {
    return !_.any(this.entities, function (entity) { return !entity.isDead; });
  },

  isFull: function () {
    return !this.isEmpty() && (this.nbEntities === _.size(this.entities));
  },

  onEmpty: function (callback) {
    this.emptyCallback = callback;
  }
});

module.exports = Area;
