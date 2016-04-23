
define(['player', 'entityfactory', 'lib/bison'], function (Player, EntityFactory, BISON) {

  var GameClient = Class.extend({
    init: function (host, port) {
      this.connection = null;
      this.host = host;
      this.port = port;

      this.connectedCallback = null;
      this.spawnCallback = null;
      this.movementCallback = null;

      this.handlers = [];
      this.handlers[Types.Messages.WELCOME] = this.receiveWelcome;
      this.handlers[Types.Messages.MOVE] = this.receiveMove;
      this.handlers[Types.Messages.LOOTMOVE] = this.receiveLootMove;
      this.handlers[Types.Messages.ATTACK] = this.receiveAttack;
      this.handlers[Types.Messages.SPAWN] = this.receiveSpawn;
      this.handlers[Types.Messages.DESPAWN] = this.receiveDespawn;
      this.handlers[Types.Messages.SPAWN_BATCH] = this.receiveSpawnBatch;
      this.handlers[Types.Messages.HEALTH] = this.receiveHealth;
      this.handlers[Types.Messages.CHAT] = this.receiveChat;
      this.handlers[Types.Messages.EQUIP] = this.receiveEquipItem;
      this.handlers[Types.Messages.DROP] = this.receiveDrop;
      this.handlers[Types.Messages.TELEPORT] = this.receiveTeleport;
      this.handlers[Types.Messages.DAMAGE] = this.receiveDamage;
      this.handlers[Types.Messages.POPULATION] = this.receivePopulation;
      this.handlers[Types.Messages.LIST] = this.receiveList;
      this.handlers[Types.Messages.DESTROY] = this.receiveDestroy;
      this.handlers[Types.Messages.KILL] = this.receiveKill;
      this.handlers[Types.Messages.HP] = this.receiveHitPoints;
      this.handlers[Types.Messages.BLINK] = this.receiveBlink;

      this.useBison = false;
      this.enable();
    },

    enable: function () {
      this.isListening = true;
    },

    disable: function () {
      this.isListening = false;
    },

    connect: function (dispatcherMode) {
      var url = 'ws://' + this.host + ':' + this.port + '/';
      var self = this;

      log.info('Trying to connect to server : ' + url);

      if (window.MozWebSocket) {
        this.connection = new MozWebSocket(url);
      } else {
        this.connection = new WebSocket(url);
      }

      if (dispatcherMode) {
        this.connection.onmessage = function (e) {
          var reply = JSON.parse(e.data);

          if (reply.status === 'OK') {
            self.dispatchedCallback(reply.host, reply.port);
          } else if (reply.status === 'FULL') {
            alert('BrowserQuest is currently at maximum player population. Please retry later.');
          } else {
            alert('Unknown error while connecting to BrowserQuest.');
          }
        };
      } else {
        this.connection.onopen = function () {
          log.info('Connected to server ' + self.host + ':' + self.port);
        };

        this.connection.onmessage = function (e) {
          if (e.data === 'go') {
            if (self.connectedCallback) {
              self.connectedCallback();
            }

            return;
          }

          if (e.data === 'timeout') {
            self.isTimeout = true;
            return;
          }

          self.receiveMessage(e.data);
        };

        this.connection.onerror = function (e) {
          log.error(e, true);
        };

        this.connection.onclose = function () {
          log.debug('Connection closed');
          $('#container').addClass('error');

          if (self.disconnectedCallback) {
            if (self.isTimeout) {
              self.disconnectedCallback(
                'You have been disconnected for being inactive for too long'
              );
            } else {
              self.disconnectedCallback('The connection to BrowserQuest has been lost');
            }
          }
        };
      }
    },

    sendMessage: function (json) {
      var data;
      if (this.connection.readyState === 1) {
        if (this.useBison) {
          data = BISON.encode(json);
        } else {
          data = JSON.stringify(json);
        }

        this.connection.send(data);
      }
    },

    receiveMessage: function (message) {
      var data;

      if (this.isListening) {
        if (this.useBison) {
          data = BISON.decode(message);
        } else {
          data = JSON.parse(message);
        }

        log.debug('data: ' + message);

        if (data instanceof Array) {
          if (data[0] instanceof Array) {
            // Multiple actions received
            this.receiveActionBatch(data);
          } else {
            // Only one action received
            this.receiveAction(data);
          }
        }
      }
    },

    receiveAction: function (data) {
      var action = data[0];
      if (this.handlers[action] && _.isFunction(this.handlers[action])) {
        this.handlers[action].call(this, data);
      } else {
        log.error('Unknown action : ' + action);
      }
    },

    receiveActionBatch: function (actions) {
      var self = this;

      _.each(actions, function (action) {
        self.receiveAction(action);
      });
    },

    receiveWelcome: function (data) {
      var id = data[1];
      var name = data[2];
      var x = data[3];
      var y = data[4];
      var hp = data[5];

      if (this.welcomeCallback) {
        this.welcomeCallback(id, name, x, y, hp);
      }
    },

    receiveMove: function (data) {
      var id = data[1];
      var x = data[2];
      var y = data[3];

      if (this.moveCallback) {
        this.moveCallback(id, x, y);
      }
    },

    receiveLootMove: function (data) {
      var id = data[1];
      var item = data[2];

      if (this.lootmoveCallback) {
        this.lootmoveCallback(id, item);
      }
    },

    receiveAttack: function (data) {
      var attacker = data[1];
      var target = data[2];

      if (this.attackCallback) {
        this.attackCallback(attacker, target);
      }
    },

    receiveSpawn: function (data) {
      var id = data[1];
      var kind = data[2];
      var x = data[3];
      var y = data[4];
      var item;

      if (Types.isItem(kind)) {
        item = EntityFactory.createEntity(kind, id);

        if (this.spawnItemCallback) {
          this.spawnItemCallback(item, x, y);
        }
      } else if (Types.isChest(kind)) {
        item = EntityFactory.createEntity(kind, id);

        if (this.spawnChestCallback) {
          this.spawnChestCallback(item, x, y);
        }
      } else {
        var name;
        var orientation;
        var target;
        var weapon;
        var armor;

        if (Types.isPlayer(kind)) {
          name = data[5];
          orientation = data[6];
          armor = data[7];
          weapon = data[8];
          if (data.length > 9) {
            target = data[9];
          }
        } else if (Types.isMob(kind)) {
          orientation = data[5];
          if (data.length > 6) {
            target = data[6];
          }
        }

        var character = EntityFactory.createEntity(kind, id, name);

        if (character instanceof Player) {
          character.weaponName = Types.getKindAsString(weapon);
          character.spriteName = Types.getKindAsString(armor);
        }

        if (this.spawnCharacterCallback) {
          this.spawnCharacterCallback(character, x, y, orientation, target);
        }
      }
    },

    receiveDespawn: function (data) {
      var id = data[1];

      if (this.despawnCallback) {
        this.despawnCallback(id);
      }
    },

    receiveHealth: function (data) {
      var points = data[1];
      var  isRegen = false;

      if (data[2]) {
        isRegen = true;
      }

      if (this.healthCallback) {
        this.healthCallback(points, isRegen);
      }
    },

    receiveChat: function (data) {
      var id = data[1];
      var text = data[2];

      if (this.chatCallback) {
        this.chatCallback(id, text);
      }
    },

    receiveEquipItem: function (data) {
      var id = data[1];
      var itemKind = data[2];

      if (this.equipCallback) {
        this.equipCallback(id, itemKind);
      }
    },

    receiveDrop: function (data) {
      var mobId = data[1];
      var id = data[2];
      var kind = data[3];

      var item = EntityFactory.createEntity(kind, id);
      item.wasDropped = true;
      item.playersInvolved = data[4];

      if (this.dropCallback) {
        this.dropCallback(item, mobId);
      }
    },

    receiveTeleport: function (data) {
      var id = data[1];
      var x = data[2];
      var y = data[3];

      if (this.teleportCallback) {
        this.teleportCallback(id, x, y);
      }
    },

    receiveDamage: function (data) {
      var id = data[1];
      var dmg = data[2];

      if (this.dmgCallback) {
        this.dmgCallback(id, dmg);
      }
    },

    receivePopulation: function (data) {
      var worldPlayers = data[1];
      var totalPlayers = data[2];

      if (this.popluationCallback) {
        this.popluationCallback(worldPlayers, totalPlayers);
      }
    },

    receiveKill: function (data) {
      var mobKind = data[1];

      if (this.killCallback) {
        this.killCallback(mobKind);
      }
    },

    receiveList: function (data) {
      data.shift();

      if (this.listCallback) {
        this.listCallback(data);
      }
    },

    receiveDestroy: function (data) {
      var id = data[1];

      if (this.destroyCallback) {
        this.destroyCallback(id);
      }
    },

    receiveHitPoints: function (data) {
      var maxHp = data[1];

      if (this.hpCallback) {
        this.hpCallback(maxHp);
      }
    },

    receiveBlink: function (data) {
      var id = data[1];

      if (this.blinkCallback) {
        this.blinkCallback(id);
      }
    },

    onDispatched: function (callback) {
      this.dispatchedCallback = callback;
    },

    onConnected: function (callback) {
      this.connectedCallback = callback;
    },

    onDisconnected: function (callback) {
      this.disconnectedCallback = callback;
    },

    onWelcome: function (callback) {
      this.welcomeCallback = callback;
    },

    onSpawnCharacter: function (callback) {
      this.spawnCharacterCallback = callback;
    },

    onSpawnItem: function (callback) {
      this.spawnItemCallback = callback;
    },

    onSpawnChest: function (callback) {
      this.spawnChestCallback = callback;
    },

    onDespawnEntity: function (callback) {
      this.despawnCallback = callback;
    },

    onEntityMove: function (callback) {
      this.moveCallback = callback;
    },

    onEntityAttack: function (callback) {
      this.attackCallback = callback;
    },

    onPlayerChangeHealth: function (callback) {
      this.healthCallback = callback;
    },

    onPlayerEquipItem: function (callback) {
      this.equipCallback = callback;
    },

    onPlayerMoveToItem: function (callback) {
      this.lootmoveCallback = callback;
    },

    onPlayerTeleport: function (callback) {
      this.teleportCallback = callback;
    },

    onChatMessage: function (callback) {
      this.chatCallback = callback;
    },

    onDropItem: function (callback) {
      this.dropCallback = callback;
    },

    onPlayerDamageMob: function (callback) {
      this.dmgCallback = callback;
    },

    onPlayerKillMob: function (callback) {
      this.killCallback = callback;
    },

    onPopulationChange: function (callback) {
      this.popluationCallback = callback;
    },

    onEntityList: function (callback) {
      this.listCallback = callback;
    },

    onEntityDestroy: function (callback) {
      this.destroyCallback = callback;
    },

    onPlayerChangeMaxHitPoints: function (callback) {
      this.hpCallback = callback;
    },

    onItemBlink: function (callback) {
      this.blinkCallback = callback;
    },

    sendHello: function (player) {
      this.sendMessage([Types.Messages.HELLO,
                       player.name,
                       Types.getKindFromString(player.getSpriteName()),
                       Types.getKindFromString(player.getWeaponName())]);
    },

    sendMove: function (x, y) {
      this.sendMessage([Types.Messages.MOVE,
                       x,
                       y]);
    },

    sendLootMove: function (item, x, y) {
      this.sendMessage([Types.Messages.LOOTMOVE,
                       x,
                       y,
                       item.id]);
    },

    sendAggro: function (mob) {
      this.sendMessage([Types.Messages.AGGRO,
                       mob.id]);
    },

    sendAttack: function (mob) {
      this.sendMessage([Types.Messages.ATTACK,
                       mob.id]);
    },

    sendHit: function (mob) {
      this.sendMessage([Types.Messages.HIT,
                       mob.id]);
    },

    sendHurt: function (mob) {
      this.sendMessage([Types.Messages.HURT,
                       mob.id]);
    },

    sendChat: function (text) {
      this.sendMessage([Types.Messages.CHAT,
                       text]);
    },

    sendLoot: function (item) {
      this.sendMessage([Types.Messages.LOOT,
                       item.id]);
    },

    sendTeleport: function (x, y) {
      this.sendMessage([Types.Messages.TELEPORT,
                       x,
                       y]);
    },

    sendWho: function (ids) {
      ids.unshift(Types.Messages.WHO);
      this.sendMessage(ids);
    },

    sendZone: function () {
      this.sendMessage([Types.Messages.ZONE]);
    },

    sendOpen: function (chest) {
      this.sendMessage([Types.Messages.OPEN,
                       chest.id]);
    },

    sendCheck: function (id) {
      this.sendMessage([Types.Messages.CHECK,
                       id]);
    }
  });

  return GameClient;
});
