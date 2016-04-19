
define(['entity'], function (Entity) {

  var Chest = Entity.extend({
    init: function (id) {
      this._super(id, Types.Entities.CHEST);
    },

    getSpriteName: function () {
      return 'chest';
    },

    isMoving: function () {
      return false;
    },

    open: function () {
      if (this.openCallback) {
        this.openCallback();
      }
    },

    onOpen: function (callback) {
      this.openCallback = callback;
    }
  });

  return Chest;
});
