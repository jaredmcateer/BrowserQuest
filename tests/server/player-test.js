import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Player from '../../server/js/player';
import Types from '../../shared/js/gametypes';
import Connection from '../../server/js/connection';
import WorldServer from '../../server/js/worldserver';
import Mob from '../../server/js/mob';
import Properties from '../../server/js/properties';
import Item from '../../server/js/item';
import Chest from '../../server/js/chest';
import Checkpoint from '../../server/js/checkpoint';

chai.use(sinonChai);

describe('Server Class: Player', () => {
  let player;
  let connection;
  let worldServer;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    let cStub = { close: () => {} };

    sandbox.stub(cStub, 'close', (...args) => { connection.closeCallback(args); });
    connection = new Connection(10, cStub);
    sandbox.stub(connection, 'send');
    sandbox.spy(connection, 'listen');
    sandbox.spy(connection, 'onClose');
    sandbox.stub(connection, 'sendUTF8', () => {});
    sandbox.spy(connection, 'close');
    sandbox.spy(connection, 'log');

    worldServer = new WorldServer();
    player = new Player(connection, worldServer);
  });

  afterEach(() => sandbox.restore());

  it('should intialize', () => {
    expect(player.server).to.eql(worldServer);
    expect(player.connection).to.eql(connection);
    expect(player.type).to.eql('player');
    expect(player.id).to.eql(connection.id);
    expect(player.kind).to.eql(Types.Entities.WARRIOR);
    expect(player.x).to.eql(0);
    expect(player.y).to.eql(0);
    expect(player.hasEnteredGame).to.be.false;
    expect(player.isDead).to.be.false;
    expect(player.haters).to.be.an('object').that.is.empty;
    expect(player.lastCheckpoint).to.be.null;
    expect(player.disconnectTimeout).to.be.null;
    expect(player.connection.listen.withArgs(sinon.match.func).calledOnce).to.be.true;
    expect(player.connection.onClose.withArgs(sinon.match.func).calledOnce).to.be.true;
    expect(player.connection.sendUTF8.withArgs('go').calledOnce).to.be.true;
  });

  it('should handle being destroyed', () => {
    let mob = new Mob(38, Types.Entities.RAT, 1, 1);
    sandbox.spy(mob, 'clearTarget');
    sandbox.spy(mob, 'forgetPlayer');

    player.addHater(mob);
    player.addAttacker(mob);

    expect(player.attackers).to.be.an('object').that.is.not.empty;
    expect(player.haters).to.be.an('object').that.is.not.empty;

    player.destroy();

    expect(player.attackers).to.be.an('object').that.is.empty;
    expect(player.haters).to.be.an('object').that.is.empty;
    expect(mob.clearTarget.callCount).to.be.at.least(1);
    expect(mob.forgetPlayer.withArgs(connection.id).calledOnce).to.be.true;
  });

  it('should be able to equip armour', () => {
    let armorItem = new Item(12, Types.Entities.LEATHERARMOR, 0, 0);
    sandbox.spy(player, 'send');

    player.equipItem(armorItem);
    expect(player.armor).to.eql(armorItem.kind);
    expect(player.armorLevel).to.eql(Properties.getArmorLevel(armorItem.kind));
    expect(player.hitPoints).to.eql(110);
    expect(player.send.calledOnce).to.be.true;
  });

  it('should be able to equip a weapon', () => {
    let weaponItem = new Item(12, Types.Entities.SWORD1, 0, 0);

    player.equipItem(weaponItem);
    expect(player.weapon).to.eql(weaponItem.kind);
    expect(player.weaponLevel).to.eql(Properties.getWeaponLevel(weaponItem.kind));
  });

  it('should send messages on the socket', () => {
    let message = { id: 'foo' };

    player.send(message);
    expect(connection.send.withArgs(message).calledOnce).to.be.true;
  });

  // TODO this ignoreSelf logic is awkward and backwards. Ticket to refactor
  // @see https://github.com/jaredmcateer/BrowserQuest/issues/13
  it('should be able to broadcast a message that it ignores itself', (done) => {
    let message = { id: 'foo' };

    player.broadcastCallback = (msg, ignoreSelf) => {
      expect(msg).to.eql(message);
      expect(ignoreSelf).to.be.true;
      done();
    };

    player.broadcast(message);
  });

  // TODO this ignoreSelf logic is awkward and backwards. Ticket to refactor
  // @see https://github.com/jaredmcateer/BrowserQuest/issues/13
  it('should be able to broadcast a message that it does not ignore', (done) => {
    let message = { id: 'foo' };

    player.broadcastCallback = (msg, ignoreSelf) => {
      expect(msg).to.eql(message);
      expect(ignoreSelf).to.be.false;
      done();
    };

    player.broadcast(message, false);
  });

  // TODO this ignoreSelf logic is awkward and backwards. Ticket to refactor
  // @see https://github.com/jaredmcateer/BrowserQuest/issues/13
  it('should broadcast to a zone that it ignores itself', (done) => {
    let message = { id: 'foo' };

    player.broadcastzoneCallback = (msg, ignoreSelf) => {
      expect(msg).to.eql(message);
      expect(ignoreSelf).to.be.true;
      done();
    };

    player.broadcastToZone(message);
  });

  // TODO this ignoreSelf logic is awkward and backwards. Ticket to refactor
  // @see https://github.com/jaredmcateer/BrowserQuest/issues/13
  it('should broadcast to a zone that it does not ignore', (done) => {
    let message = { id: 'foo' };

    player.broadcastzoneCallback = (msg, ignoreSelf) => {
      expect(msg).to.eql(message);
      expect(ignoreSelf).to.be.false;
      done();
    };

    player.broadcastToZone(message, false);
  });

  it('should be able to tell you about its state', () => {
    player.x = 10;
    player.y = 11;
    player.orientation = Types.Orientations.UP;
    player.equipArmor(Types.Entities.FIREFOX);
    player.equipWeapon(Types.Entities.SWORD1);
    player.setTarget({ id: 234 });

    let state = player.getState();
    expect(state).to.eql([
      connection.id,
      Types.Entities.WARRIOR,
      player.x,
      player.y,
      player.name,
      player.orientation,
      player.armor,
      player.weapon,
      234
    ]);
  });

  it('should be able to register an exit event handler', () => {
    let called = false;

    player.onExit(() => called = true);

    expect(called).to.be.false;
    player.exitCallback();
    expect(called).to.be.true;
  });

  it('should be able to register a move event handler', () => {
    let called = false;

    player.onMove(() => called = true);

    expect(called).to.be.false;
    player.moveCallback();
    expect(called).to.be.true;
  });

  it('should be able to register a loot move event handler', () => {
    let called = false;

    player.onLootMove(() => called = true);

    expect(called).to.be.false;
    player.lootmoveCallback();
    expect(called).to.be.true;
  });

  it('should be able to register a zone event handler', () => {
    let called = false;

    player.onZone(() => called = true);

    expect(called).to.be.false;
    player.zoneCallback();
    expect(called).to.be.true;
  });

  it('should be able to register an orientation event handler', () => {
    let called = false;

    player.onOrient(() => called = true);

    expect(called).to.be.false;
    player.orientCallback();
    expect(called).to.be.true;
  });

  it('should be able to register a message event handler', () => {
    let called = false;

    player.onMessage(() => called = true);

    expect(called).to.be.false;
    player.messageCallback();
    expect(called).to.be.true;
  });

  it('should be able to register a broadcast event handler', () => {
    let called = false;

    player.onBroadcast(() => called = true);

    expect(called).to.be.false;
    player.broadcastCallback();
    expect(called).to.be.true;
  });

  it('should be able to register a broadcast to zone event handler', () => {
    let called = false;

    player.onBroadcastToZone(() => called = true);

    expect(called).to.be.false;
    player.broadcastzoneCallback();
    expect(called).to.be.true;
  });

  it('should send a message to equip an item', () => {
    let msg = player.equip(Types.Entities.GENERIC);
    expect(msg.playerId).to.eql(player.id);
    expect(msg.itemKind).to.eql(Types.Entities.GENERIC);
  });

  it('should be able to know who hates them', () => {
    let mob = new Mob(38, Types.Entities.RAT, 1, 1);

    expect(player.haters).to.be.empty;
    player.addHater(mob);
    expect(player.haters).to.have.property(mob.id, mob);
  });

  it('should be able to remove a hater', () => {
    let mob = new Mob(38, Types.Entities.RAT, 1, 1);

    player.addHater(mob);
    expect(player.haters).to.have.property(mob.id, mob);

    player.removeHater(mob);
    expect(player.haters).to.be.empty;
  });

  it('should be able to perform a callback on each hater', () => {
    let mob1 = new Mob(38, Types.Entities.RAT, 1, 1);
    let mob2 = new Mob(39, Types.Entities.RAT, 1, 1);
    let mobs = [];

    player.addHater(mob1);
    player.addHater(mob2);

    player.forEachHater((mob) => mobs.push(mob));

    expect(mobs).to.have.lengthOf(2);
    expect(mobs).to.have.members([mob1, mob2]);
  });

  it('should be able to update its hitpoints', () => {
    player.armorLevel = 1;
    player.updateHitPoints();
    expect(player.hitPoints).to.eql(80);

    player.armorLevel = 2;
    player.updateHitPoints();
    expect(player.hitPoints).to.eql(110);

    player.armorLevel = 3;
    player.updateHitPoints();
    expect(player.hitPoints).to.eql(140);
  });

  it('should be able to update its position', () => {
    player.requestposCallback = () => ({ x: 10, y: 20 });
    player.updatePosition();

    expect(player.x).to.eql(10);
    expect(player.y).to.eql(20);
  });

  it('should be able to set a position request callback', () => {
    let called = false;
    player.onRequestPosition(() => called = true);

    player.requestposCallback();
    expect(called).to.be.true;
  });

  it('should be able to reset a disconnect timeout', () => {
    sandbox.useFakeTimers();
    sandbox.spy(player, 'timeout');

    expect(player.disconnectTimeout).to.not.exist;

    player.resetTimeout();

    expect(player.disconnectTimeout).to.exist;
    let timeout = player.disconnectTimeout;

    expect(player.disconnectTimeout).to.eql(timeout);

    player.resetTimeout();

    expect(player.disconnectTimeout).to.not.eql(timeout);
    expect(player.timeout.calledOnce).to.be.false;

    sandbox.clock.tick(1000 * 60 * 15);

    expect(player.timeout.calledOnce).to.be.true;
  });

  it('should timout a user and disconnect them', () => {
    player.timeout();
    expect(connection.sendUTF8.withArgs('timeout').calledOnce).to.be.true;
    expect(connection.close.withArgs(sinon.match.string).calledOnce).to.be.true;
  });

  it('should handle the connection closing', () => {
    let firepotionCalled = false;
    let exitCalled = false;

    sandbox.useFakeTimers();
    sandbox.spy(player, 'timeout');
    player.exitCallback = () => exitCalled = true;
    player.firepotionTimeout = setTimeout(() => firepotionCalled = true, 100);
    player.resetTimeout();

    expect(player.disconnectTimeout).to.exist;

    player.connection.closeCallback();

    // Should call exit callback
    expect(exitCalled).to.be.true;

    sandbox.clock.tick(1000 * 60 * 15 + 100);

    // Should have cleared these timeouts so they never get called
    expect(firepotionCalled).to.be.false;
    expect(player.timeout.callCount).to.equal(0);
  });

  describe('message handling,', () => {
    // TODO missing Message.Hello class
    let helloMessage = [
      Types.Messages.HELLO,
      'bob',
      Types.Entities.CLOTHARMOR,
      Types.Entities.SWORD1
    ];

    beforeEach(() => {
      sandbox.stub(player.server, 'addPlayer');
      sandbox.stub(player.server, 'enterCallback');
    });

    let errLogPrefix = 'Closing connection to undefined.';

    it('should close the connection if an invalid message is received', () => {
      let message = [-1];
      let called = false;

      player.connection.onClose(() => called = true);
      player.connection.listenCallback(message);

      let logMsg = `${errLogPrefix} Error: Invalid UNKNOWN message format: ${message}`;
      expect(player.connection.log.withArgs(logMsg).calledOnce).to.be.true;
      expect(called).to.be.true;
    });

    it('should close the connection if the first message is not HELLO', () => {
      // TODO Message isn't properly being used here. Format doesn't include
      // entity id like the definition says it should.
      // let message = new Message.Move(player);
      let message = [Types.Messages.MOVE, 10, 20];
      let called = false;

      player.connection.onClose(() => called = true);
      player.connection.listenCallback(message);

      let logMsg = `${errLogPrefix} Error: Invalid handshake message: ${message}`;
      expect(player.connection.log.withArgs(logMsg).calledOnce).to.be.true;
      expect(called).to.be.true;
    });

    it('should close the connection if HELLO is sent subsequent to user entering game', () => {
      let called = false;

      player.hasEnteredGame = true;
      player.isDead = false;
      player.connection.onClose(() => called = true);
      player.connection.listenCallback(helloMessage);

      let logMsg = `${errLogPrefix} Error: Cannot initiate handshake twice: ${helloMessage}`;
      expect(player.connection.log.withArgs(logMsg).calledOnce).to.be.true;
      expect(called).to.be.true;
    });

    it('should reset the disconnect timeout', () => {
      expect(player.disconnectTimeout).to.not.exist;
      player.connection.listenCallback(helloMessage);
      expect(player.disconnectTimeout).to.exist;
    });

    describe('HELLO message', () => {
      it('should setup the player to enter the world', () => {
        // TODO missing Message.Hello class
        let message = [
          Types.Messages.HELLO,
          'bob',
          Types.Entities.FIREFOX,
          Types.Entities.SWORD1
        ];
        let posRequestCalled = false;

        player.onRequestPosition(() => posRequestCalled = true);
        player.connection.listenCallback(message);

        expect(player.name).to.eql(message[1]);
        expect(player.armor).to.eql(message[2]);
        expect(player.weapon).to.eql(message[3]);
        expect(player.orientation).to.be.oneOf([
          Types.Orientations.LEFT,
          Types.Orientations.RIGHT,
          Types.Orientations.UP,
          Types.Orientations.DOWN
        ]);
        expect(player.hitPoints).to.eql(50);
        expect(posRequestCalled).to.be.true;
        expect(player.server.addPlayer.withArgs(player).calledOnce).to.be.true;
        expect(player.server.enterCallback.withArgs(player).calledOnce).to.be.true;

        let welcomeMsg = [
          Types.Messages.WELCOME,
          player.id,
          player.name,
          player.x,
          player.y,
          player.hitPoints
        ];
        expect(player.connection.send.withArgs(welcomeMsg).calledOnce).to.be.true;
        expect(player.hasEnteredGame).to.be.true;
        expect(player.isDead).to.be.false;
      });

      it('should prevent html in the name', () => {
        // TODO missing Message.Hello class
        let message = [
          Types.Messages.HELLO,
          '<script="alert();">bob</script>',
          Types.Entities.FIREFOX,
          Types.Entities.SWORD1
        ];

        player.connection.listenCallback(message);

        expect(player.name).to.equal('Lorem Ipsum');
      });

      it('should prevent the name from being empty', () => {
        // TODO missing Message.Hello class
        let message = [
          Types.Messages.HELLO,
          '',
          Types.Entities.FIREFOX,
          Types.Entities.SWORD1
        ];

        player.connection.listenCallback(message);

        expect(player.name).to.equal('Lorem Ipsum');
      });

      it('should prevent the name from being too long', () => {
        // TODO missing Message.Hello class
        let message = [
          Types.Messages.HELLO,
          'HUBERT BLAINE WOLFESCHLEGELSTEINHAUSENBERGERDORFF',
          Types.Entities.FIREFOX,
          Types.Entities.SWORD1
        ];

        player.connection.listenCallback(message);

        expect(player.name).to.equal('HUBERT BLAINE W');
      });
    });

    describe('assuming the new player has said HELLO,', () => {
      beforeEach(() => player.connection.listenCallback(helloMessage));

      describe('a WHO message', () => {
        it('should push spawn messages for other users in world', () => {
          let message = [Types.Messages.WHO, 1, 10, 11];
          sandbox.stub(player.server, 'pushSpawnsToPlayer');
          player.connection.listenCallback(message);
          expect(player.server.pushSpawnsToPlayer.withArgs(player, message).calledOnce).to.be.true;
        });
      });

      describe('a ZONE message', () => {
        it('should callback', () => {
          let message = [Types.Messages.ZONE];
          let called = false;
          player.zoneCallback = () => called = true;
          player.connection.listenCallback(message);
          expect(called).to.be.true;
        });
      });

      describe('a CHAT message', () => {
        it('should broad cast it to the zone', () => {
          let message = [Types.Messages.CHAT, `Hello I am ${player.name}`];
          let called = false;

          player.onBroadcastToZone((msg, ignoreSelf) => {
            called = true;
            expect(msg).to.have.property('playerId', player.id);
            expect(msg).to.have.property('message', message[1]);
            expect(ignoreSelf).to.be.false;
          });

          player.connection.listenCallback(message);
          expect(called).to.be.true;
        });

        it('should enforce maximum string length', () => {
          let message = [Types.Messages.CHAT, 'a'.repeat(65)];
          let called = false;

          player.onBroadcastToZone((msg) => {
            called = true;
            expect(msg).to.have.property('message', message[1].substr(0, 60));
          });

          player.connection.listenCallback(message);
          expect(called).to.be.true;
        });

        it('should santize the message', () => {
          let message = [Types.Messages.CHAT, 'foo<script>a</script>bar'];
          let called = false;

          player.onBroadcastToZone((msg) => {
            called = true;
            expect(msg).to.have.property('message', 'foobar');
          });

          player.connection.listenCallback(message);
          expect(called).to.be.true;
        });

        it('should not broadcast an empty message', () => {
          let message = [Types.Messages.CHAT, ''];
          let called = false;

          player.onBroadcastToZone(() => called = true);

          player.connection.listenCallback(message);
          expect(called).to.be.false;
        });
      });

      describe('a MOVE message', () => {
        let message = [Types.Messages.MOVE, 10, 20];
        let isValidPosStub;

        beforeEach(() => {
          isValidPosStub = sandbox.stub(player.server, 'isValidPosition');
        });

        it('should do nothing if a move callback is not defined', () => {
          player.connection.listenCallback(message);
          expect(player.server.isValidPosition.callCount).to.equal(0);
        });

        it('should not do anything if the position is not valid', () => {
          isValidPosStub.returns(false);
          sandbox.spy(player, 'setPosition');
          player.connection.listenCallback(message);
          expect(player.setPosition.callCount).to.equal(0);
        });

        it('should should move the user', () => {
          let moveCbCalled = false;
          let broadcastCbCalled = false;

          isValidPosStub.returns(true);

          player.setTarget(13);

          player.onBroadcast((msg) => {
            expect(msg.entity).to.eql(player);
            broadcastCbCalled = true;
          });

          player.onMove((x, y) => {
            expect(x).to.eql(message[1]);
            expect(y).to.eql(message[2]);
            moveCbCalled = true;
          });

          player.connection.listenCallback(message);

          expect(broadcastCbCalled).to.be.true;
          expect(moveCbCalled).to.be.true;
        });
      });

      describe('a LOOTMOVE message', () => {
        let message = [Types.Messages.LOOTMOVE, 10, 20, 29];
        let getEntityByIdStub;

        beforeEach(() => {
          getEntityByIdStub = sandbox.stub(player.server, 'getEntityById');
        });

        it('should do nothing if a loot move callback is not defined', () => {
          sandbox.spy(player, 'setPosition');
          player.connection.listenCallback(message);
          expect(player.setPosition.callCount).to.equal(0);
        });

        it('should not call back if item is not valid', () => {
          sandbox.spy(player, 'broadcast');
          sandbox.spy(player, 'clearTarget');
          player.lootmoveCallback = sandbox.spy();

          getEntityByIdStub.returns(false);

          player.connection.listenCallback(message);

          expect(player.x).to.equal(message[1]);
          expect(player.y).to.equal(message[2]);
          expect(player.clearTarget.callCount).to.eql(0);
          expect(player.broadcast.callCount).to.eql(0);
          expect(player.lootmoveCallback.callCount).to.eql(0);
        });

        it('should call back if item is valid', () => {
          let item = new Item(29, Types.Entities.SWORD2, 0, 0);
          let lootMoveCalled = false;
          let bcastCalled = false;

          player.setTarget({ id: 12 });
          player.onLootMove(() => lootMoveCalled = true);
          player.onBroadcast(() => bcastCalled = true);
          getEntityByIdStub.returns(item);

          expect(player.target).to.equal(12);

          player.connection.listenCallback(message);

          expect(player.x).to.equal(message[1]);
          expect(player.y).to.equal(message[2]);
          expect(player.target).to.be.null;
          expect(lootMoveCalled).to.be.true;
          expect(bcastCalled).to.be.true;
        });
      });

      describe('an AGGRO message', () => {
        let message = [Types.Messages.AGGRO, 19];

        beforeEach(() => sandbox.stub(player.server, 'handleMobHate'));

        it('should do nothing if move callback is not defined', () => {
          player.connection.listenCallback(message);
          expect(player.server.handleMobHate.callCount).to.equal(0);
        });

        it('should have the server handle the mobs hate level', () => {
          player.moveCallback = () => {};

          player.connection.listenCallback(message);

          let stub = player.server.handleMobHate;
          expect(stub.withArgs(message[1], player.id, 5).calledOnce).to.be.true;
        });
      });

      describe('an ATTACK message', () => {
        let message = [Types.Messages.ATTACK, 19];

        beforeEach(() => {
          sandbox.stub(player.server, 'getEntityById');
          sandbox.stub(player.server, 'broadcastAttacker');
        });

        it('should do nothing if not a valid mob', () => {
          sandbox.spy(player, 'setTarget');
          player.server.getEntityById.returns(false);

          player.connection.listenCallback(message);

          expect(player.setTarget.callCount).to.equal(0);
          expect(player.server.broadcastAttacker.callCount).to.equal(0);
        });

        it('should target to the mob', () => {
          let mob = new Mob(19, Types.Entities.RAT, 0, 0);
          player.server.getEntityById.returns(mob);

          player.connection.listenCallback(message);

          expect(player.target).to.equal(message[1]);
          expect(player.server.broadcastAttacker).to.be.calledWith(player);
        });
      });

      describe('a HIT message', () => {
        let message = [Types.Messages.HIT, 19];
        let mob = new Mob(19, Types.Entities.RAT, 0, 0);

        beforeEach(() => {
          sandbox.stub(player.server, 'getEntityById');
          sandbox.stub(player.server, 'handleMobHate');
          sandbox.stub(player.server, 'handleHurtEntity');
          sandbox.stub(mob, 'receiveDamage');
        });

        it('should do nothing if not a valid mob', () => {
          player.server.getEntityById.returns(false);

          player.connection.listenCallback(message);

          expect(mob.receiveDamage).to.have.callCount(0);
          expect(player.server.handleMobHate).to.have.callCount(0);
          expect(player.server.handleHurtEntity).to.have.callCount(0);
        });

        it('should hurt the enemy mob', () => {
          player.server.getEntityById.returns(mob);
          mob.armorLevel = 0;
          player.weaponLevel = 10;

          player.connection.listenCallback(message);

          expect(mob.receiveDamage).to.be.calledWith(sinon.match.number, player.id);
          expect(player.server.handleMobHate).to.be
            .calledWith(mob.id, player.id, sinon.match.number);
          expect(player.server.handleHurtEntity).to.be
            .calledWith(mob, player, sinon.match.number);
        });
      });

      describe('a HURT message', () => {
        let message = [Types.Messages.HURT, 19];
        let mob = new Mob(19, Types.Entities.RAT, 0, 0);
        let originalHp;

        beforeEach(() => {
          sandbox.stub(player.server, 'getEntityById');
          sandbox.stub(player.server, 'handleHurtEntity');
          player.updateHitPoints();
          originalHp = player.hitPoints;
        });

        it('should do nothing if not a valid mob', () => {
          player.server.getEntityById.returns(false);

          expect(player.hitPoints).to.equal(originalHp);

          player.connection.listenCallback(message);

          expect(player.hitPoints).to.equal(originalHp);
          expect(player.server.handleHurtEntity).to.have.callCount(0);
        });

        it('should do nothing if already dead', () => {
          player.server.getEntityById.returns(mob);
          player.hitPoints = 0;

          player.connection.listenCallback(message);

          expect(player.server.handleHurtEntity).to.have.callCount(0);
        });

        it('should hurt the player by an enemy mob', () => {
          player.server.getEntityById.returns(mob);
          mob.weaponLevel = 1;
          player.armorLevel = 0;

          player.connection.listenCallback(message);

          expect(player.hitPoints).to.be.below(originalHp);
          expect(player.server.handleHurtEntity).to.be.calledWith(player);
        });

        it('should kill the player when its hp drops below 0', () => {
          let called = false;
          sandbox.useFakeTimers();

          player.server.getEntityById.returns(mob);
          mob.weaponLevel = 100000;
          player.armorLevel = 0;
          player.firepotionTimeout = setTimeout(() => called = true, 1000);

          player.connection.listenCallback(message);

          expect(player.hitPoints).to.be.at.most(0);
          expect(player.server.handleHurtEntity).to.be.calledWith(player);
          expect(player.isDead).to.be.true;

          sandbox.clock.tick(1000);

          expect(called).to.be.false;
        });
      });

      describe('a LOOT message', () => {
        let message = [Types.Messages.LOOT, 20];

        beforeEach(() => {
          sandbox.stub(player.server, 'getEntityById');
          sandbox.stub(player.server, 'removeEntity');
        });

        it('should do nothing if the item is not a valid object', () => {
          player.server.getEntityById.returns(false);
          sandbox.spy(Types, 'isItem');

          player.connection.listenCallback(message);

          expect(Types.isItem).to.have.callCount(0);
          expect(player.server.removeEntity).to.have.callCount(0);
        });

        it('should do nothing if the object is not an item', () => {
          let item = new Item(20, Types.Entities.GUARD, 0, 0);
          player.server.getEntityById.returns(item);
          sandbox.spy(player, 'broadcast');

          player.connection.listenCallback(message);

          expect(player.broadcast).to.have.callCount(0);
          expect(player.server.removeEntity).to.have.callCount(0);
        });

        it('should broadcast an item despawn and equip the item', () => {
          let item = new Item(20, Types.Entities.SWORD2, 0, 0);
          sandbox.spy(player, 'broadcast');

          player.server.getEntityById.returns(item);

          expect(player.weapon).to.equal(Types.Entities.SWORD1);

          player.connection.listenCallback(message);

          expect(player.broadcast).to.be.calledWith(item.despawn());
          expect(player.server.removeEntity).to.be.calledWith(item);

          expect(player.weapon).to.equal(Types.Entities.SWORD2);
          expect(player.broadcast).to.be.calledWith(player.equip(Types.Entities.SWORD2));
        });

        describe('if it is a fire potion', () => {
          it('should turn the player into a firefox', () => {
            sandbox.useFakeTimers();

            let item = new Item(20, Types.Entities.FIREPOTION, 0, 0);

            player.server.getEntityById.returns(item);
            sandbox.spy(player, 'broadcast');

            player.connection.listenCallback(message);

            expect(player.broadcast).to.be.calledWith(player.equip(Types.Entities.FIREFOX));
            expect(player.firepotionTimeout).to.not.be.null;

            sandbox.clock.tick(15000);

            expect(player.broadcast).to.be.calledWith(player.equip(Types.Entities.CLOTHARMOR));
            expect(player.firepotionTimeout).to.be.null;
          });
        });

        describe('if it is a healing item', () => {
          it('should heal by 40 when a flask', () => {
            let item = new Item(20, Types.Entities.FLASK, 0, 0);
            player.server.getEntityById.returns(item);
            player.hitPoints = 1;

            player.connection.listenCallback(message);

            expect(player.hitPoints).to.eql(41);
          });

          it('should heal by 100 when a burger', () => {
            let item = new Item(20, Types.Entities.BURGER, 0, 0);
            player.server.getEntityById.returns(item);
            player.equipItem(new Item(21, Types.Entities.GOLDENARMOR, 0, 0));
            player.hitPoints = 1;

            player.connection.listenCallback(message);

            expect(player.hitPoints).to.eql(101);
          });
        });
      });

      describe('a TELEPORT message', () => {
        let message = [Types.Messages.TELEPORT, 9, 2];

        beforeEach(() => {
          sandbox.stub(player.server, 'isValidPosition');
          sandbox.stub(player.server, 'handlePlayerVanish');
          sandbox.stub(player.server, 'pushRelevantEntityListTo');
        });

        it('should do nothing if not a valid position', () => {
          player.server.isValidPosition.returns(false);
          sandbox.spy(player, 'setPosition');
          sandbox.spy(player, 'clearTarget');
          sandbox.spy(player, 'broadcast');
          player.connection.listenCallback(message);
          expect(player.setPosition).to.have.callCount(0);
          expect(player.clearTarget).to.have.callCount(0);
          expect(player.broadcast).to.have.callCount(0);
          expect(player.server.handlePlayerVanish).to.have.callCount(0);
          expect(player.server.pushRelevantEntityListTo).to.have.callCount(0);
        });

        it('should teleport the player if the position is valid', () => {
          let called = false;

          expect(player.x).to.eql(0);
          expect(player.y).to.eql(0);

          player.onBroadcast(() => called = true);
          player.server.isValidPosition.returns(true);

          player.connection.listenCallback(message);

          expect(player.x).to.equal(message[1]);
          expect(player.y).to.equal(message[2]);
          expect(called).to.be.true;
          expect(player.server.isValidPosition).to.be.calledWith(message[1], message[2]);
          expect(player.server.handlePlayerVanish).to.be.calledWith(player);
          expect(player.server.pushRelevantEntityListTo).to.be.calledWith(player);
        });
      });

      describe('a OPEN message', () => {
        let message = [Types.Messages.OPEN, 12];

        beforeEach(() => {
          sandbox.stub(player.server, 'handleOpenedChest');
          sandbox.stub(player.server, 'getEntityById');
        });

        it('should do nothing if not a chest', () => {
          player.server.getEntityById.returns(null);
          player.connection.listenCallback(message);
          expect(player.server.handleOpenedChest).to.have.callCount(0);
        });

        it('should handle opening a chest', () => {
          let chest = new Chest(message[1], 9, 2);
          player.server.getEntityById.returns(chest);
          player.connection.listenCallback(message);
          expect(player.server.getEntityById).to.have.calledWith(message[1]);
          expect(player.server.handleOpenedChest).to.have.calledWith(chest, player);
        });
      });

      describe('a CHECK message', () => {
        let message = [Types.Messages.CHECK, 1];

        beforeEach(() => {
          player.server.map = {
            getCheckpoint: sinon.stub()
          };
        });

        it('should do nothing if not a valid checkpoint', () => {
          player.server.map.getCheckpoint.returns(null);
          player.lastCheckpoint = null;
          player.connection.listenCallback(message);
          expect(player.lastCheckpoint).to.be.null;
        });

        it('should set a valid checkpoint', () => {
          let checkpoint = new Checkpoint(10, 2, 4, 10, 11);
          player.server.map.getCheckpoint.returns(checkpoint);
          player.lastCheckpoint = null;
          player.connection.listenCallback(message);
          expect(player.lastCheckpoint).to.eql(checkpoint);
        });
      });
    });
  });
});
