import { expect } from 'chai';
import ChestArea from '../../server/js/chestarea';
import Item from '../../server/js/item';
import Types from '../../shared/js/gametypes';

describe('Server Class: ChestArea', () => {
  let chestArea;
  const areaId = 'areaId';
  const x = 123;
  const y = 113;
  const cx = 127;
  const cy = 115;
  const h = 5;
  const w = 8;
  const items = [23, 24];
  const world = {id: 5};

  beforeEach(() => {
    chestArea = new ChestArea(areaId, x, y, w, h, cx, cy, items, world);
  });

  it('should initialize', () => {
    expect(chestArea.id).to.equal(areaId);
    expect(chestArea.x).to.equal(x);
    expect(chestArea.y).to.equal(y);
    expect(chestArea.chestX).to.equal(cx);
    expect(chestArea.chestY).to.equal(cy);
    expect(chestArea.height).to.equal(h);
    expect(chestArea.width).to.equal(w);
    expect(chestArea.items).to.eql(items);
    expect(chestArea.world).to.eql(world);
  });

  it('should be able to tell when it contains an entity', () => {
    let item1 = new Item(12, Types.Entities.GENERIC, x, y);
    let item2 = new Item(12, Types.Entities.GENERIC, x + w - 1, y);
    let item3 = new Item(12, Types.Entities.GENERIC, x, y + h - 1);
    let item4 = new Item(12, Types.Entities.GENERIC, x + 1, y);
    let item5 = new Item(12, Types.Entities.GENERIC, x, y + 1);

    expect(chestArea.contains(item1)).to.be.true;
    expect(chestArea.contains(item2)).to.be.true;
    expect(chestArea.contains(item3)).to.be.true;
    expect(chestArea.contains(item4)).to.be.true;
    expect(chestArea.contains(item5)).to.be.true;
  });

  it('should be able to tell when it does not contain an entity', () => {
    let item1 = new Item(12, Types.Entities.GENERIC, x - 1, y);
    let item2 = new Item(12, Types.Entities.GENERIC, x, y - 1);
    let item3 = new Item(12, Types.Entities.GENERIC, x + w, y);
    let item4 = new Item(12, Types.Entities.GENERIC, x, y + h);
    let item5;

    expect(chestArea.contains(item1)).to.be.false;
    expect(chestArea.contains(item2)).to.be.false;
    expect(chestArea.contains(item3)).to.be.false;
    expect(chestArea.contains(item4)).to.be.false;
    expect(chestArea.contains(item5)).to.be.false;
  });
});
