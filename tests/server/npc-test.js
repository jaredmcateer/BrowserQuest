import { expect } from 'chai';
import Npc from '../../server/js/npc';
import Types from '../../shared/js/gametypes';

describe('Server Class: Npc', () => {
  it('should initialize', () => {
    let npc = new Npc(12, Types.Entities.GUARD, 10, 20);
    expect(npc.type).to.equal('npc');
    expect(npc.id).to.equal(12);
    expect(npc.kind).to.equal(Types.Entities.GUARD);
    expect(npc.x).to.equal(10);
    expect(npc.y).to.equal(20);
  });
});
