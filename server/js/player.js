
var Character = require('./character');
var _ = require('underscore');
var Messages = require('./message');
var Utils = require('./utils');
var Properties = require('./properties');
var Formulas = require('./formulas');
var check = require('./format').check;
var Types = require('../../shared/js/gametypes');
var Chest = require('./chest');

var Player = Character.extend({
  init: function (connection, worldServer) {
    var self = this;

    this.server = worldServer;
    this.connection = connection;

    this._super(this.connection.id, 'player', Types.Entities.WARRIOR, 0, 0, '');

    this.hasEnteredGame = false;
    this.isDead = false;
    this.haters = {};
    this.lastCheckpoint = null;
    this.disconnectTimeout = null;

    this.connection.listen(function (message) {
      var action = parseInt(message[0]);

      log.debug('Received: ' + message);
      if (!check(message)) {
        self.connection.close('Invalid ' + Types.getMessageTypeAsString(action) + ' message format: ' + message);
        return;
      }

      if (!self.hasEnteredGame && action !== Types.Messages.HELLO) { // HELLO must be the first message
        self.connection.close('Invalid handshake message: ' + message);
        return;
      }

      if (self.hasEnteredGame && !self.isDead && action === Types.Messages.HELLO) { // HELLO can be sent only once
        self.connection.close('Cannot initiate handshake twice: ' + message);
        return;
      }

      self.resetTimeout();

      if (action === Types.Messages.HELLO) {
        var name = Utils.sanitize(message[1]);
        var mob;
        var item;
        var x;
        var y;

        // If name was cleared by the sanitizer, give a default name.
        // Always ensure that the name is not longer than a maximum length.
        // (also enforced by the maxlength attribute of the name input element).
        self.name = (name === '') ? 'lorem ipsum' : name.substr(0, 15);

        self.kind = Types.Entities.WARRIOR;
        self.equipArmor(message[2]);
        self.equipWeapon(message[3]);
        self.orientation = Utils.randomOrientation();
        self.updateHitPoints();
        self.updatePosition();

        self.server.addPlayer(self);
        self.server.enterCallback(self);

        self.send([Types.Messages.WELCOME, self.id, self.name, self.x, self.y, self.hitPoints]);
        self.hasEnteredGame = true;
        self.isDead = false;
      } else if (action === Types.Messages.WHO) {
        message.shift();
        self.server.pushSpawnsToPlayer(self, message);
      } else if (action === Types.Messages.ZONE) {
        self.zoneCallback();
      } else if (action === Types.Messages.CHAT) {
        var msg = Utils.sanitize(message[1]);

        // Sanitized messages may become empty. No need to broadcast empty chat messages.
        if (msg && msg !== '') {
          msg = msg.substr(0, 60); // Enforce maxlength of chat input
          self.broadcastToZone(new Messages.Chat(self, msg), false);
        }
      } else if (action === Types.Messages.MOVE) {
        if (self.moveCallback) {
          x = message[1];
          y = message[2];

          if (self.server.isValidPosition(x, y)) {
            self.setPosition(x, y);
            self.clearTarget();

            self.broadcast(new Messages.Move(self));
            self.moveCallback(self.x, self.y);
          }
        }
      } else if (action === Types.Messages.LOOTMOVE) {
        if (self.lootmoveCallback) {
          self.setPosition(message[1], message[2]);

          item = self.server.getEntityById(message[3]);
          if (item) {
            self.clearTarget();

            self.broadcast(new Messages.LootMove(self, item));
            self.lootmoveCallback(self.x, self.y);
          }
        }
      } else if (action === Types.Messages.AGGRO) {
        if (self.moveCallback) {
          self.server.handleMobHate(message[1], self.id, 5);
        }
      } else if (action === Types.Messages.ATTACK) {
        mob = self.server.getEntityById(message[1]);

        if (mob) {
          self.setTarget(mob);
          self.server.broadcastAttacker(self);
        }
      } else if (action === Types.Messages.HIT) {
        mob = self.server.getEntityById(message[1]);
        if (mob) {
          var dmg = Formulas.dmg(self.weaponLevel, mob.armorLevel);

          if (dmg > 0) {
            mob.receiveDamage(dmg, self.id);
            self.server.handleMobHate(mob.id, self.id, dmg);
            self.server.handleHurtEntity(mob, self, dmg);
          }
        }
      } else if (action === Types.Messages.HURT) {
        mob = self.server.getEntityById(message[1]);
        if (mob && self.hitPoints > 0) {
          self.hitPoints -= Formulas.dmg(mob.weaponLevel, self.armorLevel);
          self.server.handleHurtEntity(self);

          if (self.hitPoints <= 0) {
            self.isDead = true;
            if (self.firepotionTimeout) {
              clearTimeout(self.firepotionTimeout);
            }
          }
        }
      } else if (action === Types.Messages.LOOT) {
        item = self.server.getEntityById(message[1]);

        if (item) {
          var kind = item.kind;

          if (Types.isItem(kind)) {
            self.broadcast(item.despawn());
            self.server.removeEntity(item);

            if (kind === Types.Entities.FIREPOTION) {
              self.updateHitPoints();
              self.broadcast(self.equip(Types.Entities.FIREFOX));
              self.firepotionTimeout = setTimeout(function () {
                self.broadcast(self.equip(self.armor)); // return to normal after 15 sec
                self.firepotionTimeout = null;
              }, 15000);

              self.send(new Messages.HitPoints(self.maxHitPoints).serialize());
            } else if (Types.isHealingItem(kind)) {
              var amount;

              switch (kind) {
              case Types.Entities.FLASK:
                amount = 40;
                break;
              case Types.Entities.BURGER:
                amount = 100;
                break;
              }

              if (!self.hasFullHealth()) {
                self.regenHealthBy(amount);
                self.server.pushToPlayer(self, self.health());
              }
            } else if (Types.isArmor(kind) || Types.isWeapon(kind)) {
              self.equipItem(item);
              self.broadcast(self.equip(kind));
            }
          }
        }
      } else if (action === Types.Messages.TELEPORT) {
        x = message[1],
        y = message[2];

        if (self.server.isValidPosition(x, y)) {
          self.setPosition(x, y);
          self.clearTarget();

          self.broadcast(new Messages.Teleport(self));

          self.server.handlePlayerVanish(self);
          self.server.pushRelevantEntityListTo(self);
        }
      } else if (action === Types.Messages.OPEN) {
        var chest = self.server.getEntityById(message[1]);
        if (chest && chest instanceof Chest) {
          self.server.handleOpenedChest(chest, self);
        }
      } else if (action === Types.Messages.CHECK) {
        var checkpoint = self.server.map.getCheckpoint(message[1]);
        if (checkpoint) {
          self.lastCheckpoint = checkpoint;
        }
      } else {
        if (self.messageCallback) {
          self.messageCallback(message);
        }
      }
    });

    this.connection.onClose(function () {
      if (self.firepotionTimeout) {
        clearTimeout(self.firepotionTimeout);
      }

      clearTimeout(self.disconnectTimeout);
      if (self.exitCallback) {
        self.exitCallback();
      }
    });

    this.connection.sendUTF8('go'); // Notify client that the HELLO/WELCOME handshake can start
  },

  destroy: function () {
    var self = this;

    this.forEachAttacker(function (mob) {
      mob.clearTarget();
    });

    this.attackers = {};

    this.forEachHater(function (mob) {
      mob.forgetPlayer(self.id);
    });

    this.haters = {};
  },

  getState: function () {
    var basestate = this._getBaseState(),
      state = [this.name, this.orientation, this.armor, this.weapon];

    if (this.target) {
      state.push(this.target);
    }

    return basestate.concat(state);
  },

  send: function (message) {
    this.connection.send(message);
  },

  broadcast: function (message, ignoreSelf) {
    if (this.broadcastCallback) {
      this.broadcastCallback(message, ignoreSelf === undefined ? true : ignoreSelf);
    }
  },

  broadcastToZone: function (message, ignoreSelf) {
    if (this.broadcastzoneCallback) {
      this.broadcastzoneCallback(message, ignoreSelf === undefined ? true : ignoreSelf);
    }
  },

  onExit: function (callback) {
    this.exitCallback = callback;
  },

  onMove: function (callback) {
    this.moveCallback = callback;
  },

  onLootMove: function (callback) {
    this.lootmoveCallback = callback;
  },

  onZone: function (callback) {
    this.zoneCallback = callback;
  },

  onOrient: function (callback) {
    this.orientCallback = callback;
  },

  onMessage: function (callback) {
    this.messageCallback = callback;
  },

  onBroadcast: function (callback) {
    this.broadcastCallback = callback;
  },

  onBroadcastToZone: function (callback) {
    this.broadcastzoneCallback = callback;
  },

  equip: function (item) {
    return new Messages.EquipItem(this, item);
  },

  addHater: function (mob) {
    if (mob) {
      if (!(mob.id in this.haters)) {
        this.haters[mob.id] = mob;
      }
    }
  },

  removeHater: function (mob) {
    if (mob && mob.id in this.haters) {
      delete this.haters[mob.id];
    }
  },

  forEachHater: function (callback) {
    _.each(this.haters, function (mob) {
      callback(mob);
    });
  },

  equipArmor: function (kind) {
    this.armor = kind;
    this.armorLevel = Properties.getArmorLevel(kind);
  },

  equipWeapon: function (kind) {
    this.weapon = kind;
    this.weaponLevel = Properties.getWeaponLevel(kind);
  },

  equipItem: function (item) {
    if (item) {
      log.debug(this.name + ' equips ' + Types.getKindAsString(item.kind));

      if (Types.isArmor(item.kind)) {
        this.equipArmor(item.kind);
        this.updateHitPoints();
        this.send(new Messages.HitPoints(this.maxHitPoints).serialize());
      } else if (Types.isWeapon(item.kind)) {
        this.equipWeapon(item.kind);
      }
    }
  },

  updateHitPoints: function () {
    this.resetHitPoints(Formulas.hp(this.armorLevel));
  },

  updatePosition: function () {
    if (this.requestposCallback) {
      var pos = this.requestposCallback();
      this.setPosition(pos.x, pos.y);
    }
  },

  onRequestPosition: function (callback) {
    this.requestposCallback = callback;
  },

  resetTimeout: function () {
    clearTimeout(this.disconnectTimeout);
    this.disconnectTimeout = setTimeout(this.timeout.bind(this), 1000 * 60 * 15); // 15 min.
  },

  timeout: function () {
    this.connection.sendUTF8('timeout');
    this.connection.close('Player was idle for too long');
  }
});

module.exports = Player;
