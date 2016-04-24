import MobArea from '../../server/js/mobarea';
import Types from '../../shared/js/gametypes';
import WorldServer from '../../server/js/worldserver';
import { expect } from 'chai';
import sinon from 'sinon';
import Mob from '../../server/js/mob';

describe('Server Class: MobArea', () => {
  let mobArea;
  let world;
  let mob;

  const mobAreaId = 'mobAreaId';
  const numMobs = 10;
  const kind = Types.getKindAsString(Types.Entities.RAT);
  const x = 10;
  const y = 12;
  const h = 200;
  const w = 220;

  beforeEach(() => {
    world = new WorldServer('thisWorld', 20);
    sinon.stub(world, 'isValidPosition', () => true);
    sinon.stub(world, 'addMob', () => undefined);

    mobArea = new MobArea(mobAreaId, numMobs, kind, x, y, h, w, world);
  });

  it('should initialize', () => {
    expect(mobArea.world).to.eql(world);
    expect(mobArea.kind).to.eql(kind);
    expect(mobArea.nbEntities).to.eql(numMobs);
    expect(mobArea.respawns).to.be.an.array;
    expect(mobArea.respawns).to.be.empty;
    expect(mobArea.world).to.eql(world);
  });

  it('should spawn mobs', () => {
    mobArea.spawnMobs();
    expect(mobArea.entities.length).to.eql(10);
  });

  it('should respawn mobs after a delay', (done) => {
    let delay = 20;
    let origX = 10;
    let origY = 15;
    let mobId = `1${mobAreaId}${Types.Entities.RAT}1`;

    mob = new Mob(mobId, Types.Entities.RAT, origX, origY);
    mob.isDead = true;

    mobArea.addToArea(mob);
    mobArea.respawnMob(mob, delay);

    expect(mobArea.entities.length).to.eql(0);

    setTimeout(() => {
      expect(mobArea.entities.length).to.eql(1);
      expect(mob.isDead).to.be.false;
      expect(mob.x).to.not.eql(origX);
      expect(mob.y).to.not.eql(origY);
      done();
    }, delay);
  });

  it('should initiate mob roaming', (done) => {
    let delay = 20;
    let origX = 10;
    let origY = 15;
    let mobId = `1${mobAreaId}${Types.Entities.RAT}1`;

    mob = new Mob(mobId, Types.Entities.RAT, origX, origY);
    mobArea.addToArea(mob);
    mobArea.initRoaming(delay, true);

    expect(mob.x).to.eql(origX);
    expect(mob.y).to.eql(origY);

    setTimeout(() => {
      expect(mob.x).to.not.eql(origX);
      expect(mob.y).to.not.eql(origY);
      mobArea.stopRoaming();
      done();
    }, delay + 5);
  });

  it('should create a reward', () => {
    let reward = mobArea.createReward();

    expect(reward).to.have.property('x');
    expect(reward).to.have.property('y');
    expect(reward).to.have.property('kind', Types.Entities.CHEST);
  });
});
