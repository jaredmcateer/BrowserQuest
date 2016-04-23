
define(
  ['camera', 'item', 'character', 'player', 'timer'],
  function (Camera, Item, Character, Player, Timer) {

    var Renderer = Class.extend({
      init: function (game, canvas, background, foreground) {
        this.game = game;
        this.context = (canvas && canvas.getContext) ? canvas.getContext('2d') : null;
        this.background = (background && background.getContext) ?
          background.getContext('2d') : null;
        this.foreground = (foreground && foreground.getContext) ?
          foreground.getContext('2d') : null;

        this.canvas = canvas;
        this.backcanvas = background;
        this.forecanvas = foreground;

        this.initFPS();
        this.tilesize = 16;

        this.upscaledRendering = this.context.mozImageSmoothingEnabled !== undefined;
        this.supportsSilhouettes = this.upscaledRendering;

        this.rescale(this.getScaleFactor());

        this.lastTime = new Date();
        this.frameCount = 0;
        this.maxFPS = this.FPS;
        this.realFPS = 0;
        this.isDebugInfoVisible = false;

        this.animatedTileCount = 0;
        this.highTileCount = 0;

        this.tablet = Detect.isTablet(window.innerWidth);

        this.fixFlickeringTimer = new Timer(100);
      },

      getWidth: function () {
        return this.canvas.width;
      },

      getHeight: function () {
        return this.canvas.height;
      },

      setTileset: function (tileset) {
        this.tileset = tileset;
      },

      getScaleFactor: function () {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var scale;

        this.mobile = false;

        if (w <= 1000) {
          scale = 2;
          this.mobile = true;
        } else if (w <= 1500 || h <= 870) {
          scale = 2;
        } else {
          scale = 3;
        }

        return scale;
      },

      rescale: function () {
        this.scale = this.getScaleFactor();

        this.createCamera();

        this.context.mozImageSmoothingEnabled = false;
        this.background.mozImageSmoothingEnabled = false;
        this.foreground.mozImageSmoothingEnabled = false;

        this.initFont();
        this.initFPS();

        if (!this.upscaledRendering && this.game.map && this.game.map.tilesets) {
          this.setTileset(this.game.map.tilesets[this.scale - 1]);
        }

        if (this.game.renderer) {
          this.game.setSpriteScale(this.scale);
        }
      },

      createCamera: function () {
        this.camera = new Camera(this);
        this.camera.rescale();

        this.canvas.width = this.camera.gridW * this.tilesize * this.scale;
        this.canvas.height = this.camera.gridH * this.tilesize * this.scale;
        log.debug('#entities set to ' + this.canvas.width + ' x ' + this.canvas.height);

        this.backcanvas.width = this.canvas.width;
        this.backcanvas.height = this.canvas.height;
        log.debug('#background set to ' + this.backcanvas.width + ' x ' + this.backcanvas.height);

        this.forecanvas.width = this.canvas.width;
        this.forecanvas.height = this.canvas.height;
        log.debug('#foreground set to ' + this.forecanvas.width + ' x ' + this.forecanvas.height);
      },

      initFPS: function () {
        this.FPS = this.mobile ? 50 : 50;
      },

      initFont: function () {
        var fontsize;

        switch (this.scale) {
        case 1:
          fontsize = 10; break;
        case 2:
          fontsize = Detect.isWindows() ? 10 : 13; break;
        case 3:
          fontsize = 20;
        }
        this.setFontSize(fontsize);
      },

      setFontSize: function (size) {
        var font = size + 'px GraphicPixel';

        this.context.font = font;
        this.background.font = font;
      },

      drawText: function (text, x, y, centered, color, strokeColor) {
        var ctx = this.context;

        var strokeSize;

        switch (this.scale) {
        case 1:
          strokeSize = 3; break;
        case 2:
          strokeSize = 3; break;
        case 3:
          strokeSize = 5;
        }

        if (text && x && y) {
          ctx.save();
          if (centered) {
            ctx.textAlign = 'center';
          }

          ctx.strokeStyle = strokeColor || '#373737';
          ctx.lineWidth = strokeSize;
          ctx.strokeText(text, x, y);
          ctx.fillStyle = color || 'white';
          ctx.fillText(text, x, y);
          ctx.restore();
        }
      },

      drawCellRect: function (x, y, color) {
        this.context.save();
        this.context.lineWidth = 2 * this.scale;
        this.context.strokeStyle = color;
        this.context.translate(x + 2, y + 2);
        this.context.strokeRect(
          0,
          0,
          (this.tilesize * this.scale) - 4,
          (this.tilesize * this.scale) - 4
        );
        this.context.restore();
      },

      drawCellHighlight: function (x, y, color) {
        var s = this.scale;
        var ts = this.tilesize;
        var tx = x * ts * s;
        var ty = y * ts * s;

        this.drawCellRect(tx, ty, color);
      },

      drawTargetCell: function () {
        var mouse = this.game.getMouseGridPosition();

        if (this.game.targetCellVisible
            && !(mouse.x === this.game.selectedX && mouse.y === this.game.selectedY)
        ) {
          this.drawCellHighlight(mouse.x, mouse.y, this.game.targetColor);
        }
      },

      drawAttackTargetCell: function () {
        var mouse = this.game.getMouseGridPosition();
        var entity = this.game.getEntityAt(mouse.x, mouse.y);
        var s = this.scale;

        if (entity) {
          this.drawCellRect(entity.x * s, entity.y * s, 'rgba(255, 0, 0, 0.5)');
        }
      },

      drawOccupiedCells: function () {
        var positions = this.game.entityGrid;

        if (positions) {
          for (var i = 0; i < positions.length; i += 1) {
            for (var j = 0; j < positions[i].length; j += 1) {
              if (!_.isNull(positions[i][j])) {
                this.drawCellHighlight(i, j, 'rgba(50, 50, 255, 0.5)');
              }
            }
          }
        }
      },

      drawPathingCells: function () {
        var grid = this.game.pathingGrid;

        if (grid && this.game.debugPathing) {
          for (var y = 0; y < grid.length; y += 1) {
            for (var x = 0; x < grid[y].length; x += 1) {
              if (grid[y][x] === 1 && this.game.camera.isVisiblePosition(x, y)) {
                this.drawCellHighlight(x, y, 'rgba(50, 50, 255, 0.5)');
              }
            }
          }
        }
      },

      drawSelectedCell: function () {
        var sprite = this.game.cursors.target;
        var anim = this.game.targetAnimation;
        var os = this.upscaledRendering ? 1 : this.scale;
        var ds = this.upscaledRendering ? this.scale : 1;

        if (this.game.selectedCellVisible) {
          if (this.mobile || this.tablet) {
            if (this.game.drawTarget) {
              var x = this.game.selectedX;
              var y = this.game.selectedY;

              this.drawCellHighlight(this.game.selectedX, this.game.selectedY, 'rgb(51, 255, 0)');
              this.lastTargetPos = { x: x, y: y };
              this.game.drawTarget = false;
            }
          } else {
            if (sprite && anim) {
              var frame = anim.currentFrame;
              var s = this.scaler;
              x = frame.x * os;
              y = frame.y * os;
              var w = sprite.width * os;
              var h = sprite.height * os;
              var ts = 16;
              var dx = this.game.selectedX * ts * s;
              var dy = this.game.selectedY * ts * s;
              var dw = w * ds;
              var dh = h * ds;

              this.context.save();
              this.context.translate(dx, dy);
              this.context.drawImage(sprite.image, x, y, w, h, 0, 0, dw, dh);
              this.context.restore();
            }
          }
        }
      },

      clearScaledRect: function (ctx, x, y, w, h) {
        var s = this.scale;

        ctx.clearRect(x * s, y * s, w * s, h * s);
      },

      drawCursor: function () {
        var mx = this.game.mouse.x;
        var my = this.game.mouse.y;
        var s = this.scale;
        var os = this.upscaledRendering ? 1 : this.scale;

        this.context.save();
        if (this.game.currentCursor && this.game.currentCursor.isLoaded) {
          this.context.drawImage(
            this.game.currentCursor.image,
            0,
            0,
            14 * os,
            14 * os,
            mx,
            my,
            14 * s,
            14 * s
          );
        }

        this.context.restore();
      },

      drawScaledImage: function (ctx, image, x, y, w, h, dx, dy) {
        var s = this.upscaledRendering ? 1 : this.scale;
        _.each(arguments, function (arg) {
          if (_.isUndefined(arg) || _.isNaN(arg) || _.isNull(arg) || arg < 0) {
            log.error(
              ['x:', x,
                ' y:', y,
                ' w:', w,
                ' h:', h,
                ' dx:', dx,
                ' dy:', dy
              ].join(' '),
              true
            );
            throw Error('A problem occured when trying to draw on the canvas');
          }
        });

        ctx.drawImage(image,
                      x * s,
                      y * s,
                      w * s,
                      h * s,
                      dx * this.scale,
                      dy * this.scale,
                      w * this.scale,
                      h * this.scale);
      },

      drawTile: function (ctx, tileid, tileset, setW, gridW, cellid) {
        var s = this.upscaledRendering ? 1 : this.scale;
        if (tileid !== -1) { // -1 when tile is empty in Tiled. Don't attempt to draw it.
          this.drawScaledImage(ctx,
                               tileset,
                               getX(tileid + 1, (setW / s)) * this.tilesize,
                               Math.floor(tileid / (setW / s)) * this.tilesize,
                               this.tilesize,
                               this.tilesize,
                               getX(cellid + 1, gridW) * this.tilesize,
                               Math.floor(cellid / gridW) * this.tilesize);
        }
      },

      clearTile: function (ctx, gridW, cellid) {
        var s = this.scale;
        var ts = this.tilesize;
        var x = getX(cellid + 1, gridW) * ts * s;
        var y = Math.floor(cellid / gridW) * ts * s;
        var w = ts * s;
        var h = w;

        ctx.clearRect(x, y, h, w);
      },

      drawEntity: function (entity) {
        var sprite = entity.sprite;
        var shadow = this.game.shadows.small;
        var anim = entity.currentAnimation;
        var os = this.upscaledRendering ? 1 : this.scale;
        var ds = this.upscaledRendering ? this.scale : 1;

        if (anim && sprite) {
          var frame = anim.currentFrame;
          var s = this.scale;
          var x = frame.x * os;
          var y = frame.y * os;
          var w = sprite.width * os;
          var h = sprite.height * os;
          var ox = sprite.offsetX * s;
          var oy = sprite.offsetY * s;
          var dx = entity.x * s;
          var dy = entity.y * s;
          var dw = w * ds;
          var dh = h * ds;

          if (entity.isFading) {
            this.context.save();
            this.context.globalAlpha = entity.fadingAlpha;
          }

          if (!this.mobile && !this.tablet) {
            this.drawEntityName(entity);
          }

          this.context.save();
          if (entity.flipSpriteX) {
            this.context.translate(dx + this.tilesize * s, dy);
            this.context.scale(-1, 1);
          } else if (entity.flipSpriteY) {
            this.context.translate(dx, dy + dh);
            this.context.scale(1, -1);
          } else {
            this.context.translate(dx, dy);
          }

          if (entity.isVisible()) {
            if (entity.hasShadow()) {
              this.context.drawImage(shadow.image, 0, 0, shadow.width * os, shadow.height * os,
                                     0,
                                     entity.shadowOffsetY * ds,
                                     shadow.width * os * ds, shadow.height * os * ds);
            }

            this.context.drawImage(sprite.image, x, y, w, h, ox, oy, dw, dh);

            if (entity instanceof Item && entity.kind !== Types.Entities.CAKE) {
              var sparks = this.game.sprites.sparks;
              anim = this.game.sparksAnimation;
              frame = anim.currentFrame;
              var sx = sparks.width * frame.index * os;
              var sy = sparks.height * anim.row * os;
              var sw = sparks.width * os;
              var sh = sparks.width * os;

              this.context.drawImage(sparks.image, sx, sy, sw, sh,
                                     sparks.offsetX * s,
                                     sparks.offsetY * s,
                                     sw * ds, sh * ds);
            }
          }

          if (entity instanceof Character && !entity.isDead && entity.hasWeapon()) {
            var weapon = this.game.sprites[entity.getWeaponName()];

            if (weapon) {
              var weaponAnimData = weapon.animationData[anim.name];
              var index = frame.index < weaponAnimData.length ?
                frame.index : frame.index % weaponAnimData.length;
              var wx = weapon.width * index * os;
              var wy = weapon.height * anim.row * os;
              var ww = weapon.width * os;
              var wh = weapon.height * os;

              this.context.drawImage(weapon.image, wx, wy, ww, wh,
                                     weapon.offsetX * s,
                                     weapon.offsetY * s,
                                     ww * ds, wh * ds);
            }
          }

          this.context.restore();

          if (entity.isFading) {
            this.context.restore();
          }
        }
      },

      drawEntities: function (dirtyOnly) {
        var self = this;

        this.game.forEachVisibleEntityByDepth(function (entity) {
          if (entity.isLoaded) {
            if (dirtyOnly) {
              if (entity.isDirty) {
                self.drawEntity(entity);

                entity.isDirty = false;
                entity.oldDirtyRect = entity.dirtyRect;
                entity.dirtyRect = null;
              }
            } else {
              self.drawEntity(entity);
            }
          }
        });
      },

      drawDirtyEntities: function () {
        this.drawEntities(true);
      },

      clearDirtyRect: function (r) {
        this.context.clearRect(r.x, r.y, r.w, r.h);
      },

      clearDirtyRects: function () {
        var self = this;
        var count = 0;

        this.game.forEachVisibleEntityByDepth(function (entity) {
          if (entity.isDirty && entity.oldDirtyRect) {
            self.clearDirtyRect(entity.oldDirtyRect);
            count += 1;
          }
        });

        this.game.forEachAnimatedTile(function (tile) {
          if (tile.isDirty) {
            self.clearDirtyRect(tile.dirtyRect);
            count += 1;
          }
        });

        if (this.game.clearTarget && this.lastTargetPos) {
          var last = this.lastTargetPos;
          var rect = this.getTargetBoundingRect(last.x, last.y);

          this.clearDirtyRect(rect);
          this.game.clearTarget = false;
          count += 1;
        }

        //if (count > 0) {
          //log.debug("count:"+count);
        //}
      },

      getEntityBoundingRect: function (entity) {
        var rect = {};
        var s = this.scale;
        var spr;

        if (entity instanceof Player && entity.hasWeapon()) {
          var weapon = this.game.sprites[entity.getWeaponName()];
          spr = weapon;
        } else {
          spr = entity.sprite;
        }

        if (spr) {
          rect.x = (entity.x + spr.offsetX - this.camera.x) * s;
          rect.y = (entity.y + spr.offsetY - this.camera.y) * s;
          rect.w = spr.width * s;
          rect.h = spr.height * s;
          rect.left = rect.x;
          rect.right = rect.x + rect.w;
          rect.top = rect.y;
          rect.bottom = rect.y + rect.h;
        }

        return rect;
      },

      getTileBoundingRect: function (tile) {
        var rect = {};
        var gridW = this.game.map.width;
        var s = this.scale;
        var ts = this.tilesize;
        var cellid = tile.index;

        rect.x = ((getX(cellid + 1, gridW) * ts) - this.camera.x) * s;
        rect.y = ((Math.floor(cellid / gridW) * ts) - this.camera.y) * s;
        rect.w = ts * s;
        rect.h = ts * s;
        rect.left = rect.x;
        rect.right = rect.x + rect.w;
        rect.top = rect.y;
        rect.bottom = rect.y + rect.h;

        return rect;
      },

      getTargetBoundingRect: function (x, y) {
        var rect = {};
        var s = this.scale;
        var ts = this.tilesize;
        var tx = x || this.game.selectedX;
        var ty = y || this.game.selectedY;

        rect.x = ((tx * ts) - this.camera.x) * s;
        rect.y = ((ty * ts) - this.camera.y) * s;
        rect.w = ts * s;
        rect.h = ts * s;
        rect.left = rect.x;
        rect.right = rect.x + rect.w;
        rect.top = rect.y;
        rect.bottom = rect.y + rect.h;

        return rect;
      },

      isIntersecting: function (rect1, rect2) {
        return !((rect2.left > rect1.right) ||
                 (rect2.right < rect1.left) ||
                 (rect2.top > rect1.bottom) ||
                 (rect2.bottom < rect1.top));
      },

      drawEntityName: function (entity) {
        this.context.save();
        if (entity.name && entity instanceof Player) {
          var color = (entity.id === this.game.playerId) ? '#fcda5c' : 'white';
          this.drawText(entity.name,
                        (entity.x + 8) * this.scale,
                        (entity.y + entity.nameOffsetY) * this.scale,
                        true,
                        color);
        }

        this.context.restore();
      },

      drawTerrain: function () {
        var self = this;
        var m = this.game.map;
        var tilesetwidth = this.tileset.width / m.tilesize;

        this.game.forEachVisibleTile(function (id, index) {
          if (!m.isHighTile(id) && !m.isAnimatedTile(id)) { // Don't draw unnecessary tiles
            self.drawTile(self.background, id, self.tileset, tilesetwidth, m.width, index);
          }
        }, 1);
      },

      drawAnimatedTiles: function (dirtyOnly) {
        var self = this;
        var m = this.game.map;
        var tilesetwidth = this.tileset.width / m.tilesize;

        this.animatedTileCount = 0;
        this.game.forEachAnimatedTile(function (tile) {
          if (dirtyOnly) {
            if (tile.isDirty) {
              self.drawTile(self.context, tile.id, self.tileset, tilesetwidth, m.width, tile.index);
              tile.isDirty = false;
            }
          } else {
            self.drawTile(self.context, tile.id, self.tileset, tilesetwidth, m.width, tile.index);
            self.animatedTileCount += 1;
          }
        });
      },

      drawDirtyAnimatedTiles: function () {
        this.drawAnimatedTiles(true);
      },

      drawHighTiles: function (ctx) {
        var self = this;
        var m = this.game.map;
        var tilesetwidth = this.tileset.width / m.tilesize;

        this.highTileCount = 0;
        this.game.forEachVisibleTile(function (id, index) {
          if (m.isHighTile(id)) {
            self.drawTile(ctx, id, self.tileset, tilesetwidth, m.width, index);
            self.highTileCount += 1;
          }
        }, 1);
      },

      drawBackground: function (ctx, color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      },

      drawFPS: function () {
        var nowTime = new Date();
        var diffTime = nowTime.getTime() - this.lastTime.getTime();

        if (diffTime >= 1000) {
          this.realFPS = this.frameCount;
          this.frameCount = 0;
          this.lastTime = nowTime;
        }

        this.frameCount++;

        //this.drawText("FPS: " + this.realFPS + " / " + this.maxFPS, 30, 30, false);
        this.drawText('FPS: ' + this.realFPS, 30, 30, false);
      },

      drawDebugInfo: function () {
        if (this.isDebugInfoVisible) {
          this.drawFPS();
          this.drawText('A: ' + this.animatedTileCount, 100, 30, false);
          this.drawText('H: ' + this.highTileCount, 140, 30, false);
        }
      },

      drawCombatInfo: function () {
        var self = this;

        switch (this.scale) {
        case 2: this.setFontSize(20); break;
        case 3: this.setFontSize(30); break;
      }
        this.game.infoManager.forEachInfo(function (info) {
          self.context.save();
          self.context.globalAlpha = info.opacity;
          self.drawText(
            info.value,
            (info.x + 8) * self.scale,
            Math.floor(info.y * self.scale),
            true,
            info.fillColor,
            info.strokeColor
          );
          self.context.restore();
        });

        this.initFont();
      },

      setCameraView: function (ctx) {
        ctx.translate(-this.camera.x * this.scale, -this.camera.y * this.scale);
      },

      clearScreen: function (ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      },

      getPlayerImage: function () {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var os = this.upscaledRendering ? 1 : this.scale;
        var player = this.game.player;
        var sprite = player.getArmorSprite();
        var spriteAnim = sprite.animationData.idleDown;

        // character
        var row = spriteAnim.row;
        var w = sprite.width * os;
        var h = sprite.height * os;
        var y = row * h;

        // weapon
        var weapon = this.game.sprites[this.game.player.getWeaponName()];
        var ww = weapon.width * os;
        var wh = weapon.height * os;
        var wy = wh * row;
        var offsetX = (weapon.offsetX - sprite.offsetX) * os;
        var offsetY = (weapon.offsetY - sprite.offsetY) * os;

        // shadow
        var shadow = this.game.shadows.small;
        var sw = shadow.width * os;
        var sh = shadow.height * os;
        var ox = -sprite.offsetX * os;
        var oy = -sprite.offsetY * os;

        canvas.width = w;
        canvas.height = h;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(shadow.image, 0, 0, sw, sh, ox, oy, sw, sh);
        ctx.drawImage(sprite.image, 0, y, w, h, 0, 0, w, h);
        ctx.drawImage(weapon.image, 0, wy, ww, wh, offsetX, offsetY, ww, wh);

        return canvas.toDataURL('image/png');
      },

      renderStaticCanvases: function () {
        this.background.save();
        this.setCameraView(this.background);
        this.drawTerrain();
        this.background.restore();

        if (this.mobile || this.tablet) {
          this.clearScreen(this.foreground);
          this.foreground.save();
          this.setCameraView(this.foreground);
          this.drawHighTiles(this.foreground);
          this.foreground.restore();
        }
      },

      renderFrame: function () {
        if (this.mobile || this.tablet) {
          this.renderFrameMobile();
        } else {
          this.renderFrameDesktop();
        }
      },

      renderFrameDesktop: function () {
        this.clearScreen(this.context);

        this.context.save();
        this.setCameraView(this.context);
        this.drawAnimatedTiles();

        if (this.game.started) {
          this.drawSelectedCell();
          this.drawTargetCell();
        }

        //this.drawOccupiedCells();
        this.drawPathingCells();
        this.drawEntities();
        this.drawCombatInfo();
        this.drawHighTiles(this.context);
        this.context.restore();

        // Overlay UI elements
        this.drawCursor();
        this.drawDebugInfo();
      },

      renderFrameMobile: function () {
        this.clearDirtyRects();
        this.preventFlickeringBug();

        this.context.save();
        this.setCameraView(this.context);

        this.drawDirtyAnimatedTiles();
        this.drawSelectedCell();
        this.drawDirtyEntities();
        this.context.restore();
      },

      preventFlickeringBug: function () {
        if (this.fixFlickeringTimer.isOver(this.game.currentTime)) {
          this.background.fillRect(0, 0, 0, 0);
          this.context.fillRect(0, 0, 0, 0);
          this.foreground.fillRect(0, 0, 0, 0);
        }
      }
    });

    var getX = function (id, w) {
      if (id == 0) {
        return 0;
      }

      return (id % w == 0) ? w - 1 : (id % w) - 1;
    };

    return Renderer;
  }
);
