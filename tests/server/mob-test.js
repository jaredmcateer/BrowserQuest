import { expect } from 'chai';
import sinon from 'sinon';
import Mob from '../../server/js/mob';
import Types from '../../shared/js/gametypes';
import Properties from '../../server/js/properties';
import ChestArea from '../../server/js/chestarea';
import MobArea from '../../server/js/mobarea';

describe('Server Class: Mob', () => {
  let mob;
  
  const mobId = 23;
  const kind = Types.Entities.RAT;
  const x = 438;
  const y = 92;

  beforeEach(() => {
    mob = new Mob(mobId, kind, x, y);
  });

  it('should initialize', () => {
    expect(mob.id).to.equal(mobId);
    expect(mob.kind).to.equal(kind);
    expect(mob.type).to.equal('mob');
    expect(mob.x).to.equal(x);
    expect(mob.y).to.equal(y);

    expect(mob.hitPoints).to.equal(Properties.rat.hp);
    expect(mob.spawningX).to.equal(x);
    expect(mob.spawningY).to.equal(y);
    expect(mob.armorLevel).to.equal(Properties.rat.armor);
    expect(mob.weaponLevel).to.equal(Properties.rat.weapon);
    expect(mob.hatelist).to.be.an('array').that.is.empty;
    expect(mob.respawnTimeout).to.be.null;
    expect(mob.returnTimeout).to.be.null;
    expect(mob.isDead).to.be.false;
  });

  describe('on being destroyed', () => {
    it('should update its own properties', () => {
      mob.hatelist = [{id: 20}, {id: 30}, {id: 12}, {id: 330}];
      mob.setTarget(23);
      mob.hitPoints = 2;
      mob.x = 10;
      mob.y = 10;

      expect(mob.hatelist).to.be.an('array').that.is.not.empty;
      expect(mob.target).to.not.be.null;

      mob.destroy();

      expect(mob.isDead).to.be.true;
      expect(mob.hatelist).to.be.an('array').that.is.empty;
      expect(mob.target).to.be.null;
      expect(mob.hitPoints).to.equal(Properties.rat.hp);
      expect(mob.x).to.equal(x);
      expect(mob.y).to.equal(y);
    });

    it('should handle its own respawning if not in a mob area', () => {
      let clock = sinon.useFakeTimers();
      let called = false;
      let chestArea = new ChestArea();
      sinon.spy(chestArea, 'removeFromArea');

      mob.area = chestArea;
      mob.respawnCallback = () => called = true;
      mob.destroy();

      clock.tick(30000);

      expect(called).to.be.true;
      expect(chestArea.removeFromArea.withArgs(mob).calledOnce).to.be.true;

      clock.restore();
    });

    it('should let the mob area handle respawning if in one', () => {
      let mobArea = new MobArea();
      sinon.stub(mobArea, 'respawnMob');

      mob.area = mobArea;
      mob.destroy();

      expect(mobArea.respawnMob.withArgs(mob, 30000).calledOnce).to.be.true;
    });
  });

  it('should receive damage', () => {
    expect(mob.hitPoints).to.equal(Properties.rat.hp);
    mob.receiveDamage(10);
    expect(mob.hitPoints).to.eql(Properties.rat.hp - 10);
  });

  it('should know who it hates', () => {
    mob.hatelist = [{ id: 20 }, { id: 30 }, { id: 12 }, { id: 330 }];
    expect(mob.hates(12)).to.be.true;
    expect(mob.hates(21)).to.be.false;
  });

  it('should learn to hate people more', () => {
    expect(mob.hates(10)).to.be.false;
    mob.increaseHateFor(10, 1);
    expect(mob.hates(10)).to.be.true;
    expect(mob.hatelist.filter(h => h.id === 10)[0]).to.have.property('hate', 1);
    mob.increaseHateFor(10, 3);
    expect(mob.hatelist.filter(h => h.id === 10)[0]).to.have.property('hate', 4);
  });

  it('should return to spawn', () => {
    var clock = sinon.useFakeTimers();
    mob.setTarget(12);
    mob.x = x + 20;
    mob.y = y + 1;
    expect(mob.returnTimeout).to.be.null;

    mob.returnToSpawningPosition();

    expect(mob.target).to.be.null;
    expect(mob.returnTimeout).to.be.an('object');
    expect(mob.x).to.be.equal(x + 20);
    expect(mob.y).to.be.equal(y + 1);

    clock.tick(4000);

    expect(mob.x).to.be.equal(x);
    expect(mob.y).to.be.equal(y);

    clock.restore();
  });

  it('should follow someone it hates instead of returning to spawn', () => {
    var clock = sinon.useFakeTimers();
    let newX = x + 20;
    let newY = y + 30;
    mob.setTarget(12);
    mob.x = newX;
    mob.y = newY;
    expect(mob.returnTimeout).to.be.null;

    mob.returnToSpawningPosition();
    mob.increaseHateFor(12);

    // TODO it's currently unclear to me why a mob wouldn't retarget the player
    // perhaps it's done elsewhere or maybe this is a BUG.
    expect(mob.target).to.be.null;
    expect(mob.returnTimeout).to.be.null;
    expect(mob.x).to.be.equal(newX);
    expect(mob.y).to.be.equal(newY);

    clock.tick(4000);

    // shouldn't have moved back to spawn position
    expect(mob.x).to.be.equal(newX);
    expect(mob.y).to.be.equal(newY);

    clock.restore();
  });

  it('should be able to find the top hated player', () => {
    mob.increaseHateFor(10, 10);
    mob.increaseHateFor(11, 20);
    mob.increaseHateFor(12, 4);
    mob.increaseHateFor(13, 43);

    expect(mob.getHatedPlayerId()).to.equal(13);
    expect(mob.getHatedPlayerId(1)).to.equal(13);
    expect(mob.getHatedPlayerId(2)).to.equal(11);
    expect(mob.getHatedPlayerId(3)).to.equal(10);
    expect(mob.getHatedPlayerId(4)).to.equal(12);
  });

  it('should learn to forget about their hate and go home', () => {
    let clock = sinon.useFakeTimers();
    let newX = x + 20;
    let newY = y + 30;

    mob.x = newX;
    mob.y = newY;

    mob.increaseHateFor(10, 120);
    mob.increaseHateFor(11, 13);
    expect(mob.getHatedPlayerId()).to.equal(10);

    mob.forgetPlayer(10, 1000);
    expect(mob.getHatedPlayerId()).to.equal(11);

    clock.tick(1000);

    expect(mob.x).to.be.equal(newX);
    expect(mob.y).to.be.equal(newY);

    mob.forgetPlayer(11, 1000);
    expect(mob.getHatedPlayerId()).to.not.exist;

    clock.tick(1000);

    expect(mob.x).to.be.equal(x);
    expect(mob.y).to.be.equal(y);

    clock.restore();
  });

  it('should learn to forgive everyone', () => {
    let clock = sinon.useFakeTimers();
    let newX = x + 20;
    let newY = y + 30;

    mob.x = newX;
    mob.y = newY;

    mob.increaseHateFor(10, 120);
    mob.increaseHateFor(11, 13);
    expect(mob.hatelist).to.have.lengthOf(2);

    mob.forgetEveryone();

    expect(mob.hatelist).to.be.empty;
    expect(mob.x).to.be.equal(newX);
    expect(mob.y).to.be.equal(newY);

    clock.tick(1);

    expect(mob.x).to.be.equal(x);
    expect(mob.y).to.be.equal(y);
    clock.restore();
  });

  it('should drop items', () => {
    let item = { id: 1231 };
    let message = mob.drop(item);
    expect(message.mob).to.equal(mob);
    expect(message.item).to.equal(item);
  });

  it('should set a callback to call on respawn', () => {
    let callback = () => {};

    mob.onRespawn(callback);
    expect(mob.respawnCallback).to.eql(callback);
  });

  it('should set a callback to call on move', () => {
    let callback = () => {};

    mob.onMove(callback);
    expect(mob.moveCallback).to.eql(callback);
  });

  it('should be able to move', () => {
    let newX = x + 20;
    let newY = y + 30;
    let called = false;

    mob.onMove(() => called = true);
    mob.move(newX, newY);

    expect(called).to.be.true;
    expect(mob.x).to.equal(newX);
    expect(mob.y).to.equal(newY);
  });

  it('should be able to tell how far from its spawn point it is', () => {
    let newX = x + 20;
    let newY = y + 30;
    let distance = mob.distanceToSpawningPoint(newX, newY);

    expect(distance).to.equal(30);
  });
});
