import Entity from '../../server/js/entity';
import Types from '../../shared/js/gametypes';
import { expect } from 'chai';

describe('Server Class: Entity', () => {
  let entity;
  let entityId = 1;
  let type = 'generic';
  let kind = Types.entities.GENERIC;

  beforeEach(() => {
    entity = new Entity(entityId, type, kind, x, y);
  });

  it('should instantiate', () => {
  });
});
