import chai from 'chai';
import Area from '../../server/js/area';

const expect = chai.expect;

describe('Class: Area', () => {
  let area;
  const areaId = 'areaId';
  const x = 10;
  const y = 15;
  const h = 20;
  const w = 25;
  const entity = {id: 1, name: 'foo'};

  beforeEach(() => {
    area = new Area(areaId, x, y, w, h);
  });

  it('should instantiate', () => {
    expect(area.id).to.be.eql(areaId);
    expect(area.x).to.be.eql(x);
    expect(area.y).to.be.eql(y);
    expect(area.height).to.be.eql(h);
    expect(area.width).to.be.eql(w);
    expect(area.world).to.be.null;
    expect(area.entities).to.be.empty;
    expect(area.hasCompletelyRespawned).to.be.true;
  });

  it('should add an entity to the area', () => {
    expect(area.entities).to.be.empty;
    area.addToArea(entity);
    expect(area.entities).to.not.be.empty;
    expect(area.entities[0]).to.be.eql(entity);
  });

  it('should remove an entity from the area', () => {
    area.addToArea(entity);
    expect(area.entities).to.not.be.empty;
    area.removeFromArea(entity);
    expect(area.entities).to.be.empty;
  });

  it('should callback when there are no more entities in the area', (done) => {
    area.addToArea(entity);

    area.onEmpty(() => {
      expect(area.entities).to.be.empty;
      done();
    });

    area.removeFromArea(entity);
  });

  it('should update the max number of entities in the area', () => {
    area.setNumberOfEntities(10);
    expect(area.nbEntities).to.be.eql(10);
  });

  it('should be able to tell if the area is empty.', () => {
    expect(area.isEmpty()).to.be.true;
    area.addToArea(entity);
    expect(area.isEmpty()).to.be.false;
  });

  it('should be able to tell if the area is full', () => {
    area.setNumberOfEntities(1);
    expect(area.isFull()).to.be.false;
    area.addToArea(entity);
    expect(area.isFull()).to.be.true;
  });
});
