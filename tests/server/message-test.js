import { expect } from 'chai';

import Messages from '../../server/js/message';
import Types from '../../shared/js/gametypes';
import Entity from '../../server/js/entity';
import Item from '../../server/js/item';

describe.only('Class Objects: Messages', () => {
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
});
