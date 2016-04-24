import { expect } from 'chai';
import sinon from 'sinon';
import Character from '../../server/js/character';
import Type from '../../shared/js/gametypes';

describe('Server Class: Character', () => {
  let character;
  let charId = 3;
  let type = 'generic';
  let kind = Type.Entities.GENERIC;
  let x = 10;
  let y = 15;
  let Messages;

  beforeEach(() => {
    character = new Character(charId, type, kind, x, y);
    Messages = {
      Attack: sinon.spy(),
      Health: sinon.spy()
    };
    character.Messages = Messages;
  });

  it('should instantiate', () => {
    expect(character.orientation).to.be.within(1, 4);
    expect(character).to.have.property('attackers');
    expect(character).to.have.property('target');
  });

  it('should return the state', () => {
    let targetId = 8;
    character.target = targetId;
    let state = character.getState();
    expect(state[state.length - 1]).to.eql(targetId);
    expect(state[state.length - 2]).to.eql(character.orientation);
  });

  it('should be able to set a target', () => {
    let target = new Character(8, type, kind, 11, 16);
    character.setTarget(target);
    expect(character.target).to.eql(target.id);
  });

  it('should be able to tell it a target', () => {
    expect(character.hasTarget()).to.be.false;
    let target = new Character(8, type, kind, 11, 16);
    character.setTarget(target);
    expect(character.target).to.eql(target.id);
    expect(character.hasTarget()).to.be.true;
  });

  it('should be able to clear a target', () => {
    let target = new Character(8, type, kind, 11, 16);
    character.setTarget(target);
    character.clearTarget();
    expect(character.target).to.be.null;
  });

  it('should be able to check if health is full', () => {
    character.maxHitPoints = 10;
    character.hitPoints = 10;
    expect(character.hasFullHealth()).to.be.true;
    character.hitPoints = 1;
    expect(character.hasFullHealth()).to.be.false;
  });

  it('should be able to regenerate health', () => {
    character.maxHitPoints = 100;
    character.hitPoints = 10;
    character.regenHealthBy(10);
    expect(character.hitPoints).to.eql(20);
  });

  it('should not be able to regenerate health past max', () => {
    character.maxHitPoints = 100;
    character.hitPoints = 10;
    character.regenHealthBy(100);
    expect(character.hitPoints).to.eql(100);
  });

  it('should send a Message it is attacking', () => {
    let target = new Character(8, type, kind, 11, 16);
    character.setTarget(target);
    character.attack();
    expect(Messages.Attack.withArgs(character.id, target.id).calledOnce).to.be.true;
  });

  it('should send a Message of its health status', () => {
    let hitPoints = 10;
    character.hitPoints = hitPoints;
    character.health();
    expect(Messages.Health.withArgs(hitPoints, false).calledOnce).to.be.true;
  });

  it('should send a Message of its health regen', () => {
    let hitPoints = 10;
    character.hitPoints = hitPoints;
    character.regen();
    expect(Messages.Health.withArgs(hitPoints, true).calledOnce).to.be.true;
  });

  it('should should be able to add an attacker', () => {
    let attacker = new Character(8, type, kind, 11, 16);

    expect(character.attackers).to.be.empty;

    character.addAttacker(attacker);

    expect(character.attackers).to.not.be.empty;
    expect(character.attackers[attacker.id]).to.eql(attacker);
  });

  it('should be able to remove an attacker', () => {
    let attacker = new Character(8, type, kind, 11, 16);
    character.addAttacker(attacker);
    expect(character.attackers).to.not.be.empty;
    character.removeAttacker(attacker);
    expect(character.attackers).to.be.empty;
  });

  it('should be able to iterate all attackers', () => {
    let attacker1 = new Character(8, type, kind, 11, 16);
    let attacker2 = new Character(9, type, kind, 12, 16);
    let attacker3 = new Character(7, type, kind, 11, 15);
    character.addAttacker(attacker1);
    character.addAttacker(attacker2);
    character.addAttacker(attacker3);
    expect(character.attackers).to.not.be.empty;

    let attackers = [];
    character.forEachAttacker((attacker) => {
      attackers.push(attacker);
    });

    expect(attackers).to.have.lengthOf(3);
    expect(attackers).to.contain(attacker1);
    expect(attackers).to.contain(attacker2);
    expect(attackers).to.contain(attacker3);
  });
});
