import { expect } from 'chai';
import formulas from '../../server/js/formulas';

describe('Server Object: formulas', () => {
  it('should be able to calculate damage', () => {
    let weapon = 1;
    let armour = 0;

    for (let i = 0; i < 100; i++) {
      let damage = formulas.dmg(weapon, armour);
      expect(damage).to.be.within(5, 10);
    }
  });

  it('should be able to calculate damage with armour factored in', () => {
    let weapon = 1;
    let armour = 1;

    for (let i = 0; i < 100; i++) {
      let damage = formulas.dmg(weapon, armour);
      expect(damage).to.be.within(2, 9);
    }
  });

  it('should be able to calculate damage when armour greatly exceeds weapon', () => {
    let weapon = 1;
    let armour = 10;

    for (let i = 0; i < 100; i++) {
      let damage = formulas.dmg(weapon, armour);
      expect(damage).to.be.within(0, 3);
    }
  });

  it('should should be able to calculate hp with armor factored in', () => {
    expect(formulas.hp(1)).to.equal(80);
    expect(formulas.hp(2)).to.equal(110);
    expect(formulas.hp(3)).to.equal(140);
  });
});
