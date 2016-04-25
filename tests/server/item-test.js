import { expect } from 'chai';
import sinon from 'sinon';
import Item from '../../server/js/item';
import Type from '../../shared/js/gametypes';

describe('Server Class: Item', () => {
  let item;
  let itemId = 9;
  let kind = Type.Entities.GENERIC;
  let x = 10;
  let y = 13;

  beforeEach(() => {
    item = new Item(itemId, kind, x, y);
  });

  it('should instantiate', () => {
    expect(item.isStatic).to.be.false;
    expect(item.isFromChest).to.be.false;
  });

  it('should handle despawning', (done) => {
    let params = {
      blinkCallback: sinon.spy(),
      beforeBlinkDelay: 10,
      despawnCallback: sinon.spy(),
      blinkingDuration: 20
    };

    item.handleDespawn(params);

    setTimeout(() => {
      expect(params.blinkCallback.calledOnce).to.be.true;
      expect(params.despawnCallback.calledOnce).to.be.false;
    }, 15);

    setTimeout(() => {
      expect(params.blinkCallback.calledOnce).to.be.true;
      expect(params.despawnCallback.calledOnce).to.be.true;
      done();
    }, 35);
  });

  it('should schedule respawns of static items', (done) => {
    let callback = sinon.spy();
    item.onRespawn(callback);
    item.scheduleRespawn(0);
    setTimeout(() => {
      expect(item.respawnCallback.calledOnce).to.be.true;
      done();
    }, 0);
  });

  describe('on destroy', () => {
    let params;

    beforeEach(() => {
      params = {
        blinkCallback: sinon.spy(),
        beforeBlinkDelay: 1000,
        despawnCallback: sinon.spy(),
        blinkingDuration: 1000
      };
      item.scheduleRespawn = sinon.spy();
    });

    it('should schedule a respawn if static', () => {
      item.isStatic = true;
      item.destroy();
      expect(item.scheduleRespawn.calledOnce).to.be.true;
    });

    it('should be clear the blink timeout', () => {
      item.handleDespawn(params);
      expect(item.blinkTimeout).to.exist;
      expect(item.despawnTimeout).to.not.exist;
      expect(item.blinkTimeout._onTimeout).to.not.be.null;
      item.destroy();
      expect(item.blinkTimeout._onTimeout).to.be.null;
      expect(item.despawnTimeout).to.not.exist;
      expect(item.scheduleRespawn.callCount).to.eql(0);
    });

    it('should clear the despawn timeout', (done) => {
      params.beforeBlinkDelay = 0;
      item.handleDespawn(params);
      expect(item.blinkTimeout).to.exist;
      expect(item.despawnTimeout).to.not.exist;

      setTimeout(() => {
        expect(item.despawnTimeout).to.exist;
        item.destroy();
        expect(item.blinkTimeout._onTimeout).to.be.null;
        expect(item.despawnTimeout._onTimeout).to.be.null;
        expect(item.scheduleRespawn.callCount).to.eql(0);
        done();
      }, 0);
    });
  });
});
