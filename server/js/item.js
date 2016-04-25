var Entity = require('./entity.js');

var Item = Entity.extend({
  init: function (id, kind, x, y) {
    this._super(id, 'item', kind, x, y);
    this.isStatic = false;
    this.isFromChest = false;
    this.respawnDelay = 30000;
  },

  handleDespawn: function (params) {
    var self = this;

    this.blinkTimeout = setTimeout(function () {
      params.blinkCallback();
      self.despawnTimeout = setTimeout(
        params.despawnCallback,
        params.blinkingDuration
      );
    }, params.beforeBlinkDelay);
  },

  destroy: function () {
    if (this.blinkTimeout) {
      clearTimeout(this.blinkTimeout);
    }

    if (this.despawnTimeout) {
      clearTimeout(this.despawnTimeout);
    }

    if (this.isStatic) {
      this.scheduleRespawn();
    }
  },

  scheduleRespawn: function (delay) {
    var self = this;
    delay = delay || this.delay;

    setTimeout(function () {
      if (self.respawnCallback) {
        self.respawnCallback();
      }
    }, delay);
  },

  onRespawn: function (callback) {
    this.respawnCallback = callback;
  }
});

module.exports = Item;
