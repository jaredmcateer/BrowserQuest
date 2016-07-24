import { expect } from 'chai';
import Checkpoint from '../../server/js/checkpoint';

describe('Server Class: Checkpoint', () => {
  let checkpoint;
  let cpId = 'cp1';
  let x = 11;
  let y = 5;
  let h = 100;
  let w = 120;

  beforeEach(() => {
    checkpoint = new Checkpoint(cpId, x, y, w, h);
  });

  it('should initialize', () => {
    expect(checkpoint.id).to.equal(cpId);
    expect(checkpoint.x).to.equal(x);
    expect(checkpoint.y).to.equal(y);
    expect(checkpoint.width).to.equal(w);
    expect(checkpoint.height).to.equal(h);
  });

  it('should get a random position', () => {
    for (let i = 0; i < 100; i++) {
      let pos = checkpoint.getRandomPosition();
      expect(pos.x).to.be.within(0, x + w - 1);
      expect(pos.y).to.be.within(0, y + h - 1);
    }
  });
});
