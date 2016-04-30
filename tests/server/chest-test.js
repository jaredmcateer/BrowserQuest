import { expect } from 'chai';
import Chest from '../../server/js/chest';
import Types from '../../shared/js/gametypes';
import Item from '../../server/js/item';

describe('Server Class: Chest', () => {
  let chest;

  beforeEach(() => {
    chest = new Chest(12, 10, 11);
  });

  it('should instantiate', () => {
    expect(chest.id).to.eql(12);
    expect(chest.x).to.eql(10);
    expect(chest.y).to.eql(11);
    expect(chest.kind).to.eql(Types.Entities.CHEST);
  });

  it('should insert items into the chest', () => {
    chest.setItems()
  });
});
