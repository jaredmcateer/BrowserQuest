import Entity from '../../server/js/entity';
import Types from '../../shared/js/gametypes';
import { expect } from 'chai';
import sinon from 'sinon';

describe('Server Class: Entity', () => {
  let entity;
  let entityId = 1;
  let type = 'generic';
  let kind = Types.Entities.GENERIC;
  let x = 10;
  let y = 15;
  let Messages;

  beforeEach(() => {
    entity = new Entity(entityId, type, kind, x, y);
    Messages = {
      Spawn: sinon.spy(),
      Despawn: sinon.spy()
    };

    entity.Messages = Messages;
  });

  it('should instantiate', () => {
    expect(entity.id).to.be.eql(entityId);
    expect(entity.type).to.be.eql(type);
    expect(entity.kind).to.be.eql(kind);
    expect(entity.x).to.be.eql(x);
    expect(entity.y).to.be.eql(y);
  });

  it('should create a spawn message', () => {
    entity.spawn();
    expect(Messages.Spawn.withArgs(entity).calledOnce).to.be.true;
  });

  it('should create a despawn message', () => {
    entity.despawn();
    expect(Messages.Despawn.withArgs(entity.id).calledOnce).to.be.true;
  });

  it('should send a spawn message', () => {
    entity.spawn();
    expect(Messages.Spawn.withArgs(entity).calledOnce).to.be.true;
  });

  it('should be able to return the current state', () => {
    expect(entity.getState()).to.be.eql([
      entityId,
      kind,
      x,
      y
    ]);
  });

  it('should be able to have the position set', () => {
    let newX = 20;
    let newY = 22;

    expect(entity.x).to.be.eql(x);
    expect(entity.y).to.be.eql(y);

    entity.setPosition(newX, newY);

    expect(entity.x).to.be.eql(newX);
    expect(entity.y).to.be.eql(newY);
  });

  it('should find a positon close to another entity', () => {
    let pos;

    for (let i = 0; i < 50; i++) {
      pos = entity.getPositionNextTo(entity);
      expect(pos.x).to.be.within(entity.x - 1, entity.x + 1);
      expect(pos.y).to.be.within(entity.y - 1, entity.y + 1);
    }
  });
});
