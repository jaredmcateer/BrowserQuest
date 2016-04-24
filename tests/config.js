import path from 'path';

export default {
  port: 8000,
  debugLevel: 'info',
  nbPlayersPerWorld: 200,
  nbWorlds: 5,
  mapFilePath: path.resolve(path.dirname(__filename), './test_world_server.json'),
  metricsEnabled: false
};
