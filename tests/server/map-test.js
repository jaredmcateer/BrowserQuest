import chai from 'chai';
import chaiString from 'chai-string';
import mockFs from 'mock-fs';
import MapClass from '../../server/js/map';
import Checkpoint from '../../server/js/checkpoint';

const expect = chai.expect;
chai.use(chaiString);

describe('Server Class: Area', () => {
  before(() => {
    mockFs({
      'config/map.json': JSON.stringify(require('../test_world_server.json')),
      'config/map.txt': 'asdf'
    });
  });

  after(() => mockFs.restore());

  describe('on initalization it', () => {
    it('should callback with an eror if file is not found', (done) => {
      const map = new MapClass('some/path/invalidFile', (err) => {
        expect(err).to.equal('some/path/invalidFile doesn\'t exist.');
        done();
      });
    });

    it('should callback with an error if it cannot parse the file', (done) => {
      const map = new MapClass('config/map.txt', (err) => {
        expect(err).to.startWith('Could not parse JSON file:');
        done();
      });
    });

    it('should callback without an error if it was given a valid json file', (done) => {
      const map = new MapClass('config/map.json', (err) => {
        expect(err).to.not.exist;
        expect(map.isLoaded).to.be.true;
        done();
      });
      expect(map.isLoaded).to.be.false;
    });
  });

  describe('when initialized with a valid map', () => {
    let map;

    const tileData = [
      // [-1, { x: -2, y: -1 }], // TODO this should probably be an error
      // [0, { x: 0, y: -1 }], // TODO this should probably be an error
      [1, { x: 0, y: 0 }],
      [5, { x: 4, y: 0 }],
      [172, { x: 171, y: 0 }],
      [173, { x: 0, y: 1 }],
      [344, { x: 171, y: 1 }],
      [345, { x: 0, y: 2 }],
    ];

    before(done => map = new MapClass('config/map.json', err => done(err)));

    it('should initalize the correct map properties', () => {
      expect(map.width).to.equal(172);
      expect(map.height).to.equal(314);
      expect(map.collisions).to.be.an('array').and.not.empty;
      expect(map.mobAreas).to.be.an('array').and.not.empty;
      expect(map.chestAreas).to.be.an('array').and.not.empty;
      expect(map.staticChests).to.be.an('array').and.not.empty;
      expect(map.staticEntities).to.be.an('object').and.not.empty;
      expect(map.isLoaded).to.be.true;
      expect(map.zoneWidth).to.equal(28);
      expect(map.zoneHeight).to.equal(12);
      expect(map.groupWidth).to.equal(6);
      expect(map.groupHeight).to.equal(26);
      expect(map.connectedGroups).to.be.an('object').and.not.empty;
      expect(map.checkpoints).to.be.an('object').and.not.empty;
      expect(map.startingAreas).to.be.an('array').and.not.empty;
    });

    it('should convert tile indexes to grid position', () => {
      tileData.forEach((datum) => {
        const expected = map.tileIndexToGridPosition(datum[0]);
        const actual = datum[1];
        expect(expected).to.eql(actual);
      });
    });

    it('should convert grid position to tile index', () => {
      tileData.forEach((datum) => {
        const expected = map.gridPositionToTileIndex(datum[1].x, datum[1].y);
        const actual = datum[0];
        expect(expected).to.eql(actual);
      });
    });

    it('should generate a collision grid', function () {
      this.timeout(3000);
      expect(map).to.not.have.property('grid');
      map.generateCollisionGrid();
      expect(map).to.have.property('grid');
      expect(map.grid).to.be.an('array').and.not.empty;
    });

    it('should be able to detect out of bounds', () => {
      const data = [
        [{ x: 0, y: 1 }, true],
        [{ x: 1, y: 0 }, true],
        [{ x: map.width, y: 1 }, true],
        [{ x: 1, y: map.height }, true],
        [{ x: 1, y: 1 }, false],
        [{ x: 1, y: 1 }, false],
        [{ x: map.width - 1, y: 1 }, false],
        [{ x: 1, y: map.height - 1 }, false],
      ];

      data.forEach(datum => {
        const expected = datum[1];
        const actual = map.isOutOfBounds(datum[0].x, datum[0].y);
        expect(expected).to.equal(actual, `${JSON.stringify(datum[0])}`);
      });
    });

    it('should be able to tell when a collision occurs', () => {
      // Out of bounds
      expect(map.isColliding(0, 0)).to.be.false;

      // Collision map
      const coord = map.tileIndexToGridPosition(map.collisions[0]);
      expect(map.isColliding(coord.x, coord.y)).to.be.true;

      // known non-colliding tile.
      expect(map.isColliding(40, 0)).to.be.false;
    });

    it('should be able to generate a group ip from position', () => {
      expect(map.getGroupIdFromPosition(10, 1)).to.equal('0-0');
      expect(map.getGroupIdFromPosition(30, 1)).to.equal('1-0');
      expect(map.getGroupIdFromPosition(30, 15)).to.equal('1-1');
      expect(map.getGroupIdFromPosition(1000, 1)).to.equal('35-0');
      expect(map.getGroupIdFromPosition(1000, 1000)).to.equal('35-83');
    });

    it('should be able to get the group positon from id', () => {
      expect(map.groupIdToGroupPosition('1-1')).to.eql({ x: 1, y: 1 });
      expect(map.groupIdToGroupPosition('10-11')).to.eql({ x: 10, y: 11 });
    });

    it('should be able to iterate and all the groups', () => {
      const expectedCount = map.groupWidth * map.groupHeight;
      let actualCount = 0;
      map.forEachGroup(() => {
        actualCount++;
      });

      expect(actualCount).to.equal(expectedCount);
    });

    it('should return agacent groups for a given group', () => {
      const actual = map.getAdjacentGroupPositions('5-9');
      const expected = [
        { x: 4, y: 8 },
        { x: 4, y: 9 },
        { x: 4, y: 10 },

        { x: 5, y: 8 },
        { x: 5, y: 9 },
        { x: 5, y: 10 },

        // { x: 6, y: 8 }, // groupWidth >= 6, these get excluded
        // { x: 6, y: 9 },
        // { x: 6, y: 10 },

        // connected groups
        { x: 0, y: 12 },

        // { x: 0, y: 11 }, // Excluded as first one is already connected
      ];
      expect(actual).to.be.an('array').that.is.not.empty;
      expect(actual).to.deep.have.same.members(expected);
    });

    it('should be able to iterate all the adjacent groups of a given id', () => {
      const expected = 7;
      let actual = 0;

      map.forEachAdjacentGroup('5-9', () => {
        actual++;
      });

      expect(actual).to.equal(expected);
    });

    it('should return a checkpoint for a given id', () => {
      // from test map data: { h: 2, id: 1, s: 1, w: 9, x: 14, y: 210 }
      const expected = new Checkpoint(1, 14, 210, 9, 2);
      expect(map.getCheckpoint(1)).to.eql(expected);
    });
  });
});
