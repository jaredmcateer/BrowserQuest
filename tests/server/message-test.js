import { expect } from 'chai';

import Messages from '../../server/js/message';
import Types from '../../shared/js/gametypes';
import Entity from '../../server/js/entity';
import Item from '../../server/js/item';
import Mob from '../../server/js/mob';

describe('Class Objects: Messages', () => {
  let entity;
  let entityId = 1;
  let kind = Types.Entities.GENERIC;
  let type = 'generic';
  let x = 10;
  let y = 15;

  beforeEach(() => {
    entity = new Entity(entityId, type, kind, x, y);
  });

  describe('Spawn', () => {
    it('should initialize', () => {
      let message = new Messages.Spawn(entity);
      expect(message.entity).to.eql(entity);
    });

    it('should serialize', () => {
      let message = new Messages.Spawn(entity);
      expect(message.serialize()).to.eql([
        Types.Messages.SPAWN, entityId, Types.Entities.GENERIC, x, y
      ]);
    });
  });

  describe('Despawn', () => {
    it('should initialize', () => {
      let message = new Messages.Despawn(entityId);
      expect(message.entityId).to.eql(entityId);
    });

    it('should serialize', () => {
      let message = new Messages.Despawn(entityId);
      expect(message.serialize()).to.eql([Types.Messages.DESPAWN, entityId]);
    });
  });

  describe('Move', () => {
    it('should initialize', () => {
      let message = new Messages.Move(entity);
      expect(message.entity).to.eql(entity);
    });

    it('should serialize', () => {
      let message = new Messages.Move(entity);
      expect(message.serialize()).to.eql([Types.Messages.MOVE, entityId, x, y]);
    });
  });

  describe('LootMove', () => {
    let item;
    let itemId = 2;
    let message;

    beforeEach(() => {
      item = new Item(itemId, Types.Entities.GENERIC, 20, 30);
      message = new Messages.LootMove(entity, item);
    });

    it('should initialize', () => {
      expect(message.entity).to.eql(entity);
      expect(message.item).to.eql(item);
    });

    it('should serialize', () => {
      expect(message.serialize()).to.eql([Types.Messages.LOOTMOVE, entityId, itemId]);
    });
  });

  describe('Attack', () => {
    it('should initialize', () => {
      let message = new Messages.Attack(1, 2);
      expect(message.attackerId).to.eql(1);
      expect(message.targetId).to.eql(2);
    });

    it('should serialize', () => {
      let message = new Messages.Attack(1, 2);
      expect(message.serialize()).to.eql([Types.Messages.ATTACK, 1, 2]);
    });
  });

  describe('Health', () => {
    describe('Points', () => {
      it('should initialize', () => {
        let message = new Messages.Health(10, false);
        expect(message.points).to.eql(10);
        expect(message.isRegen).to.be.false;
      });

      it('should serialize', () => {
        let message = new Messages.Health(10, false);
        expect(message.serialize()).to.eql([Types.Messages.HEALTH, 10]);
      });
    });

    describe('Regen', () => {
      it('should initialize', () => {
        let message = new Messages.Health(10, true);
        expect(message.points).to.eql(10);
        expect(message.isRegen).to.be.true;
      });

      it('should serialize', () => {
        let message = new Messages.Health(10, true);
        expect(message.serialize()).to.eql([Types.Messages.HEALTH, 10, 1]);
      });
    });
  });

  describe('HitPoints', () => {
    it('should initialize', () => {
      let message = new Messages.HitPoints(100);
      expect(message.maxHitPoints).to.eql(100);
    });

    it('should serialize', () => {
      let message = new Messages.HitPoints(100);
      expect(message.serialize()).to.eql([Types.Messages.HP, 100]);
    });
  });

  describe('EquipItem', () => {
    let player = {id: 1};
    it('should initialize', () => {
      let message = new Messages.EquipItem(player, Types.Entities.GENERIC);
      expect(message.playerId).to.eql(player.id);
      expect(message.itemKind).to.eql(Types.Entities.GENERIC);
    });

    it('should serialize', () => {
      let message = new Messages.EquipItem(player, Types.Entities.GENERIC);
      expect(message.serialize()).to.eql([Types.Messages.EQUIP, player.id, Types.Entities.GENERIC]);
    });
  });

  describe('Drop', () => {
    let mobId = 10;
    let x = 12;
    let y = 30;
    let itemId = 2;

    it('should initialize', () => {
      let mob = new Mob(mobId, Types.Entities.RAT, x, y);
      let item = new Item(itemId, Types.Entities.GENERIC, 20, 30);
      let message = new Messages.Drop(mob, item);
      expect(message.mob).to.eql(mob);
      expect(message.item).to.eql(item);
    });

    it('should serialize', () => {
      let mob = new Mob(mobId, Types.Entities.RAT, x, y);
      mob.increaseHateFor(12, 10);
      let item = new Item(itemId, Types.Entities.GENERIC, 20, 30);
      let message = new Messages.Drop(mob, item);
      expect(message.serialize()).to.eql([
        Types.Messages.DROP,
        mob.id,
        item.id,
        item.kind,
        [12]
      ]);
    });
  });

  describe('Chat', () => {
    let player = {id: 1};
    let chatMsg = 'foo bar';
    it('should initialize', () => {
      let message = new Messages.Chat(player, chatMsg);
      expect(message.playerId).to.eql(player.id);
      expect(message.message).to.eql(chatMsg);
    });

    it('should serialize', () => {
      let message = new Messages.Chat(player, chatMsg);
      expect(message.serialize()).to.eql([Types.Messages.CHAT, player.id, chatMsg]);
    });
  });

  describe('Teleport', () => {
    it('should initialize', () => {
      let message = new Messages.Teleport(entity);
      expect(message.entity).to.eql(entity);
    });

    it('should serialize', () => {
      let message = new Messages.Teleport(entity);
      expect(message.serialize()).to.eql([Types.Messages.TELEPORT, entityId, x, y]);
    });
  });

  describe('Damage', () => {
    it('should initialize', () => {
      let message = new Messages.Damage(entity, 10);
      expect(message.entity).to.eql(entity);
      expect(message.points).to.eql(10);
    });

    it('should serialize', () => {
      let message = new Messages.Damage(entity, 10);
      expect(message.serialize()).to.eql([Types.Messages.DAMAGE, entityId, 10]);
    });
  });

  describe('Population', () => {
    it('should initialize', () => {
      let message = new Messages.Population(90, 100);
      expect(message.current).to.eql(90);
      expect(message.total).to.eql(100);
    });

    it('should serialize', () => {
      let message = new Messages.Population(90, 100);
      expect(message.serialize()).to.eql([Types.Messages.POPULATION, 90, 100]);
    });
  });

  describe('Kill', () => {
    it('should initialize', () => {
      let mob = new Mob(91, Types.Entities.RAT, 47, 82);
      let message = new Messages.Kill(mob);
      expect(message.mob).to.eql(mob);
    });

    it('should serialize', () => {
      let mob = new Mob(91, Types.Entities.RAT, 47, 82);
      let message = new Messages.Kill(mob);
      expect(message.serialize()).to.eql([Types.Messages.KILL, mob.kind]);
    });
  });

  describe('List', () => {
    it('should initialize', () => {
      let list = [1, 2, 3, 4];
      let message = new Messages.List(list);
      expect(message.ids).to.eql(list);
    });

    it('should serialize', () => {
      let list = [1, 2, 3, 4];
      let message = new Messages.List(list);
      let expected = [Types.Messages.LIST].concat(list);
      expect(message.serialize()).to.eql(expected);
    });
  });

  describe('Destroy', () => {
    it('should initialize', () => {
      let message = new Messages.Destroy(entity);
      expect(message.entity).to.eql(entity);
    });

    it('should serialize', () => {
      let message = new Messages.Destroy(entity);
      expect(message.serialize()).to.eql([Types.Messages.DESTROY, entity.id]);
    });
  });

  describe('Blink', () => {
    it('should initialize', () => {
      let item = new Item(4, Types.Entities.GENERIC, 20, 30);
      let message = new Messages.Blink(item);
      expect(message.item).to.eql(item);
    });

    it('should serialize', () => {
      let item = new Item(4, Types.Entities.GENERIC, 20, 30);
      let message = new Messages.Blink(item);
      expect(message.serialize()).to.eql([Types.Messages.BLINK, item.id]);
    });
  });
});
