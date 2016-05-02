
var url = require('url');
var wsserver = require('websocket-server');
var MiksagoConnection = require('websocket-server/lib/ws/connection');
var WorlizeRequest = require('websocket').request;
var http = require('http');
var Utils = require('./utils');
var BISON = require('bison');
var WS = {};
var useBison = false;
var Connection = require('./connection');
var Server = require('./server');

module.exports = WS;

/**
 * MultiVersionWebsocketServer
 *
 * Websocket server supporting draft-75, draft-76 and version 08+ of the WebSocket protocol.
 * Fallback for older protocol versions borrowed from https://gist.github.com/1219165
 */
WS.MultiVersionWebsocketServer = Server.extend({
  worlizeServerConfig: {
    // All options *except* 'httpServer' are required when bypassing
    // WebSocketServer.
    maxReceivedFrameSize: 0x10000,
    maxReceivedMessageSize: 0x100000,
    fragmentOutgoingMessages: true,
    fragmentationThreshold: 0x4000,
    keepalive: true,
    keepaliveInterval: 20000,
    assembleFragments: true,

    // autoAcceptConnections is not applicable when bypassing WebSocketServer
    // autoAcceptConnections: false,
    disableNagleAlgorithm: true,
    closeTimeout: 5000
  },
  _connections: {},
  _counter: 0,

  init: function (port) {
    var self = this;

    this._super(port);

    this._httpServer = http.createServer(function (request, response) {
      var path = url.parse(request.url).pathname;
      switch (path) {
      case '/status':
        if (self.statusCallback) {
          response.writeHead(200);
          response.write(self.statusCallback());
        }

        break;

      default: response.writeHead(404);
      }
      response.end();
    });

    this._httpServer.listen(port, function () {
      log.info('Server is listening on port ' + port);
    });

    this._miksagoServer = wsserver.createServer();
    this._miksagoServer.server = this._httpServer;
    this._miksagoServer.addListener('connection', function (connection) {
      // Add remoteAddress property
      connection.remoteAddress = connection._socket.remoteAddress;

      // We want to use "sendUTF" regardless of the server implementation
      connection.sendUTF = connection.send;
      var c = new WS.miksagoWebSocketConnection(self._createId(), connection, self);

      if (self.connectionCallback) {
        self.connectionCallback(c);
      }

      self.addConnection(c);
    });

    this._httpServer.on('upgrade', function (req, socket, head) {
      if (typeof req.headers['sec-websocket-version'] !== 'undefined') {
        // WebSocket hybi-08/-09/-10 connection (WebSocket-Node)
        var wsRequest = new WorlizeRequest(socket, req, self.worlizeServerConfig);
        try {
          wsRequest.readHandshake();
          var wsConnection = wsRequest.accept(wsRequest.requestedProtocols[0], wsRequest.origin);
          var c = new WS.worlizeWebSocketConnection(self._createId(), wsConnection, self);
          if (self.connectionCallback) {
            self.connectionCallback(c);
          }

          self.addConnection(c);
        }
        catch (e) {
          console.log('WebSocket Request unsupported by WebSocket-Node: ' + e.toString());
          return;
        }
      } else {
        // WebSocket hixie-75/-76/hybi-00 connection (node-websocket-server)
        if (req.method === 'GET' &&
            (req.headers.upgrade && req.headers.connection) &&
              req.headers.upgrade.toLowerCase() === 'websocket' &&
                req.headers.connection.toLowerCase() === 'upgrade') {
          new MiksagoConnection(
            self._miksagoServer.manager,
            self._miksagoServer.options,
            req,
            socket,
            head
          );
        }
      }
    });
  },

  _createId: function () {
    return '5' + Utils.random(99) + '' + (this._counter++);
  },

  broadcast: function (message) {
    this.forEachConnection(function (connection) {
      connection.send(message);
    });
  },

  onRequestStatus: function (statusCallback) {
    this.statusCallback = statusCallback;
  }
});

/**
 * Connection class for Websocket-Node (Worlize)
 * https://github.com/Worlize/WebSocket-Node
 */
WS.worlizeWebSocketConnection = Connection.extend({
  init: function (id, connection, server) {
    var self = this;

    this._super(id, connection, server);

    this._connection.on('message', function (message) {
      if (self.listenCallback) {
        if (message.type === 'utf8') {
          if (useBison) {
            self.listenCallback(BISON.decode(message.utf8Data));
          } else {
            try {
              self.listenCallback(JSON.parse(message.utf8Data));
            } catch (e) {
              if (e instanceof SyntaxError) {
                self.close('Received message was not valid JSON.');
              } else {
                throw e;
              }
            }
          }
        }
      }
    });

    this._connection.on('close', function () {
      if (self.closeCallback) {
        self.closeCallback();
      }

      delete self._server.removeConnection(self.id);
    });
  },

  send: function (message) {
    var data;
    if (useBison) {
      data = BISON.encode(message);
    } else {
      data = JSON.stringify(message);
    }

    this.sendUTF8(data);
  },

  sendUTF8: function (data) {
    this._connection.sendUTF(data);
  }
});

/**
 * Connection class for websocket-server (miksago)
 * https://github.com/miksago/node-websocket-server
 */
WS.miksagoWebSocketConnection = Connection.extend({
  init: function (id, connection, server) {
    var self = this;

    this._super(id, connection, server);

    this._connection.addListener('message', function (message) {
      if (self.listenCallback) {
        if (useBison) {
          self.listenCallback(BISON.decode(message));
        } else {
          self.listenCallback(JSON.parse(message));
        }
      }
    });

    this._connection.on('close', function () {
      if (self.closeCallback) {
        self.closeCallback();
      }

      delete self._server.removeConnection(self.id);
    });
  },

  send: function (message) {
    var data;
    if (useBison) {
      data = BISON.encode(message);
    } else {
      data = JSON.stringify(message);
    }

    this.sendUTF8(data);
  },

  sendUTF8: function (data) {
    this._connection.send(data);
  }
});
