import { expect } from 'chai';
import Chest from '../../server/js/chest';
import Types from '../../shared/js/gametypes';
import Item from '../../server/js/item';

describe('Server Class: Chest', () => {
  let chest;
  let items;

  beforeEach(() => {
    chest = new Chest(12, 10, 11);

    items = [];
    for (let i = 1; i <= 5; i++) {
      items.push(new Item(i, Types.Entities.GENERIC, 0, 0));
    }
  });

  it('should instantiate', () => {
    expect(chest.id).to.eql(12);
    expect(chest.x).to.eql(10);
    expect(chest.y).to.eql(11);
    expect(chest.kind).to.eql(Types.Entities.CHEST);
  });

  it('should insert items into the chest', () => {
    chest.setItems(items);

    expect(chest.items).to.have.lengthOf(5);
    expect(chest.items).to.eql(items);
  });

  it('should return a random item', function () {
    chest.setItems(items);

    let results = {};
    for (let i = 0; i < 100; i++) {
      let item = chest.getRandomItem();
      let key = `item${item.id}`;
      (key in results) ? results[key]++ : results[key] = 1;
    }

    // Should get a somewhat even distribution of items 
    expect(results.item1).to.be.within(15,25);
    expect(results.item2).to.be.within(15,25);
    expect(results.item3).to.be.within(15,25);
    expect(results.item4).to.be.within(15,25);
  });
});
