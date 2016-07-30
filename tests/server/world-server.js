import chai from 'chai';
import sinon from 'sinon';
import World from '../../server/js/worldserver';

const expect = chai.expect;

describe.only('Server Class: World', () => {
  const id = 1;
  const maxPlayers = 20;
  const mockServer = sinon.mock();

  let world;

  beforeEach(() => world = new World(id, maxPlayers, mockServer))

  it('should initialize', () => {
    expect(world.id).to.equal(id);
    expect(world.maxPlayers).to.equal(maxPlayers);
    expect(world.server).to.equal(mockServer);
    expect(world.ups).to.equal(50);
    expect(world.map).to.be.null;
    expect(world.entities).to.be.an('object').and.is.empty;
    expect(world.players).to.be.an('object').and.is.empty;
    expect(world.mobs).to.be.an('object').and.is.empty;
    expect(world.attackers).to.be.an('object').and.is.empty;
    expect(world.items).to.be.an('object').and.is.empty;
    expect(world.equipping).to.be.an('object').and.is.empty;
    expect(world.hurt).to.be.an('object').and.is.empty;
    expect(world.npcs).to.be.an('object').and.is.empty;
    expect(world.mobAreas).to.be.an('array').and.is.empty;
    expect(world.chestAreas).to.be.an('array').and.is.empty;
    expect(world.groups).to.be.an('object').and.is.empty;
    expect(world.outgoingQueues).to.be.an('object').and.is.empty;
    expect(world.itemCount).to.equal(0);
    expect(world.playerCount).to.equal(0);
    expect(world.zoneGroupsReady).to.be.false;
  });

  it('should be able to update the update speed', () => {
    const expected = 60;
    world.setUpdatesPerSecond(expected);
    expect(world.ups).to.equal(expected);
  });

  it('should set the callbacks for events', () => {
    const handlers = [[
      'onPlayerConnect',
      'onPlayerEnter',
      'onPlayerAdded',
      'onPlayerRemoved',
      'onRegenTick',
    ], [
      'connectCallback',
      'enterCallback',
      'addedCallback',
      'removedCallback',
      'regenCallback',
    ]];

    handlers[0].forEach((handler, index) => {
      const callback = () => {};

      world[handler](callback);
      expect(world[handlers[1][index]]).to.equal(callback);
    });
  });
});
