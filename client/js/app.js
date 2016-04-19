
define(['jquery', 'storage'], function ($, Storage) {

  var App = Class.extend({
    init: function () {
      this.currentPage = 1;
      this.blinkInterval = null;
      this.previousState = null;
      this.isParchmentReady = true;
      this.ready = false;
      this.storage = new Storage();
      this.watchNameInputInterval = setInterval(this.toggleButton.bind(this), 100);
      this.$playButton = $('.play'),
        this.$playDiv = $('.play div');
    },

    setGame: function (game) {
      this.game = game;
      this.isMobile = this.game.renderer.mobile;
      this.isTablet = this.game.renderer.tablet;
      this.isDesktop = !(this.isMobile || this.isTablet);
      this.supportsWorkers = !!window.Worker;
      this.ready = true;
    },

    center: function () {
      window.scrollTo(0, 1);
    },

    canStartGame: function () {
      if (this.isDesktop) {
        return (this.game && this.game.map && this.game.map.isLoaded);
      } else {
        return this.game;
      }
    },

    tryStartingGame: function (username, startingCallback) {
      var self = this;
      var $play = this.$playButton;

      if (username !== '') {
        if (!this.ready || !this.canStartGame()) {
          if (!this.isMobile) {
            // on desktop and tablets, add a spinner to the play button
            $play.addClass('loading');
          }

          this.$playDiv.unbind('click');
          var watchCanStart = setInterval(function () {
            log.debug('waiting...');
            if (self.canStartGame()) {
              setTimeout(function () {
                if (!self.isMobile) {
                  $play.removeClass('loading');
                }
              }, 1500);

              clearInterval(watchCanStart);
              self.startGame(username, startingCallback);
            }
          }, 100);
        } else {
          this.$playDiv.unbind('click');
          this.startGame(username, startingCallback);
        }
      }
    },

    startGame: function (username, startingCallback) {
      var self = this;

      if (startingCallback) {
        startingCallback();
      }

      this.hideIntro(function () {
        if (!self.isDesktop) {
          // On mobile and tablet we load the map after the player has clicked
          // on the PLAY button instead of loading it in a web worker.
          self.game.loadMap();
        }

        self.start(username);
      });
    },

    start: function (username) {
      var self = this;
      var firstTimePlaying = !self.storage.hasAlreadyPlayed();

      if (username && !this.game.started) {
        var optionsSet = false;
        var config = this.config;

        //>>includeStart("devHost", pragmas.devHost);
        if (config.local) {
          log.debug('Starting game with local dev config.');
          this.game.setServerOptions(config.local.host, config.local.port, username);
        } else {
          log.debug('Starting game with default dev config.');
          this.game.setServerOptions(config.dev.host, config.dev.port, username);
        }

        optionsSet = true;

        //>>includeEnd("devHost");

        //>>includeStart("prodHost", pragmas.prodHost);

        if (!optionsSet) {
          log.debug('Starting game with build config.');
          this.game.setServerOptions(config.build.host, config.build.port, username);
        }

        //>>includeEnd("prodHost");

        this.center();
        this.game.run(function () {
          $('body').addClass('started');
          if (firstTimePlaying) {
            self.toggleInstructions();
          }
        });
      }
    },

    setMouseCoordinates: function (event) {
      var gamePos = $('#container').offset();
      var scale = this.game.renderer.getScaleFactor();
      var width = this.game.renderer.getWidth();
      var height = this.game.renderer.getHeight();
      var mouse = this.game.mouse;

      mouse.x = event.pageX - gamePos.left - (this.isMobile ? 0 : 5 * scale);
      mouse.y = event.pageY - gamePos.top - (this.isMobile ? 0 : 7 * scale);

      if (mouse.x <= 0) {
        mouse.x = 0;
      } else if (mouse.x >= width) {
        mouse.x = width - 1;
      }

      if (mouse.y <= 0) {
        mouse.y = 0;
      } else if (mouse.y >= height) {
        mouse.y = height - 1;
      }
    },

    initHealthBar: function () {
      var scale = this.game.renderer.getScaleFactor();
      var healthMaxWidth = $('#healthbar').width() - (12 * scale);

      this.game.onPlayerHealthChange(function (hp, maxHp) {
        var barWidth = Math.round((healthMaxWidth / maxHp) * (hp > 0 ? hp : 0));
        $('#hitpoints').css('width', barWidth + 'px');
      });

      this.game.onPlayerHurt(this.blinkHealthBar.bind(this));
    },

    blinkHealthBar: function () {
      var $hitpoints = $('#hitpoints');

      $hitpoints.addClass('white');
      setTimeout(function () {
        $hitpoints.removeClass('white');
      }, 500);
    },

    toggleButton: function () {
      var name = $('#parchment input').val();
      var $play = $('#createcharacter .play');

      if (name && name.length > 0) {
        $play.removeClass('disabled');
        $('#character').removeClass('disabled');
      } else {
        $play.addClass('disabled');
        $('#character').addClass('disabled');
      }
    },

    hideIntro: function (hiddenCallback) {
      clearInterval(this.watchNameInputInterval);
      $('body').removeClass('intro');
      setTimeout(function () {
        $('body').addClass('game');
        hiddenCallback();
      }, 1000);
    },

    showChat: function () {
      if (this.game.started) {
        $('#chatbox').addClass('active');
        $('#chatinput').focus();
        $('#chatbutton').addClass('active');
      }
    },

    hideChat: function () {
      if (this.game.started) {
        $('#chatbox').removeClass('active');
        $('#chatinput').blur();
        $('#chatbutton').removeClass('active');
      }
    },

    toggleInstructions: function () {
      if ($('#achievements').hasClass('active')) {
        this.toggleAchievements();
        $('#achievementsbutton').removeClass('active');
      }

      $('#instructions').toggleClass('active');
    },

    toggleAchievements: function () {
      if ($('#instructions').hasClass('active')) {
        this.toggleInstructions();
        $('#helpbutton').removeClass('active');
      }

      this.resetPage();
      $('#achievements').toggleClass('active');
    },

    resetPage: function () {
      var self = this;
      var $achievements = $('#achievements');

      if ($achievements.hasClass('active')) {
        $achievements.bind(TRANSITIONEND, function () {
          $achievements.removeClass('page' + self.currentPage).addClass('page1');
          self.currentPage = 1;
          $achievements.unbind(TRANSITIONEND);
        });
      }
    },

    initEquipmentIcons: function () {
      var scale = this.game.renderer.getScaleFactor();
      var getIconPath = function (spriteName) {
        return 'img/' + scale + '/item-' + spriteName + '.png';
      };

      var weapon = this.game.player.getWeaponName();
      var armor = this.game.player.getSpriteName();
      var weaponPath = getIconPath(weapon);
      var armorPath = getIconPath(armor);

      $('#weapon').css('background-image', 'url("' + weaponPath + '")');
      if (armor !== 'firefox') {
        $('#armor').css('background-image', 'url("' + armorPath + '")');
      }
    },

    hideWindows: function () {
      if ($('#achievements').hasClass('active')) {
        this.toggleAchievements();
        $('#achievementsbutton').removeClass('active');
      }

      if ($('#instructions').hasClass('active')) {
        this.toggleInstructions();
        $('#helpbutton').removeClass('active');
      }

      if ($('body').hasClass('credits')) {
        this.closeInGameCredits();
      }

      if ($('body').hasClass('about')) {
        this.closeInGameAbout();
      }
    },

    showAchievementNotification: function (id, name) {
      var $notif = $('#achievement-notification');
      var $name = $notif.find('.name');
      var $button = $('#achievementsbutton');

      $notif.removeClass().addClass('active achievement' + id);
      $name.text(name);
      if (this.game.storage.getAchievementCount() === 1) {
        this.blinkInterval = setInterval(function () {
          $button.toggleClass('blink');
        }, 500);
      }

      setTimeout(function () {
        $notif.removeClass('active');
        $button.removeClass('blink');
      }, 5000);
    },

    displayUnlockedAchievement: function (id) {
      var $achievement = $('#achievements li.achievement' + id);

      var achievement = this.game.getAchievementById(id);
      if (achievement && achievement.hidden) {
        this.setAchievementData($achievement, achievement.name, achievement.desc);
      }

      $achievement.addClass('unlocked');
    },

    unlockAchievement: function (id, name) {
      this.showAchievementNotification(id, name);
      this.displayUnlockedAchievement(id);

      var nb = parseInt($('#unlocked-achievements').text());
      $('#unlocked-achievements').text(nb + 1);
    },

    initAchievementList: function (achievements) {
      var self = this;
      var $lists = $('#lists');
      var $page = $('#page-tmpl');
      var $achievement = $('#achievement-tmpl');
      var page = 0;
      var count = 0;
      var $p = null;

      _.each(achievements, function (achievement) {
        count++;

        var $a = $achievement.clone();
        $a.removeAttr('id');
        $a.addClass('achievement' + count);
        if (!achievement.hidden) {
          self.setAchievementData($a, achievement.name, achievement.desc);
        }

        $a.find('.twitter').attr('href', [
          'http://twitter.com/share?url=http%3A%2F%2Fbrowserquest.mozilla.org',
          '&text=I%20unlocked%20the%20%27',
          achievement.name,
          '%27%20achievement%20on%20Mozilla%27s%20%23BrowserQuest%21',
          '&related=glecollinet:Creators%20of%20BrowserQuest%2Cwhatthefranck'
        ].join(''));

        $a.show();
        $a.find('a').click(function () {
          var url = $(this).attr('href');

          self.openPopup('twitter', url);
          return false;
        });

        if ((count - 1) % 4 === 0) {
          page++;
          $p = $page.clone();
          $p.attr('id', 'page' + page);
          $p.show();
          $lists.append($p);
        }

        $p.append($a);
      });

      $('#total-achievements').text($('#achievements').find('li').length);
    },

    initUnlockedAchievements: function (ids) {
      var self = this;

      _.each(ids, function (id) {
        self.displayUnlockedAchievement(id);
      });

      $('#unlocked-achievements').text(ids.length);
    },

    setAchievementData: function ($el, name, desc) {
      $el.find('.achievement-name').html(name);
      $el.find('.achievement-description').html(desc);
    },

    toggleCredits: function () {
      var currentState = $('#parchment').attr('class');

      if (this.game.started) {
        $('#parchment').removeClass().addClass('credits');

        $('body').toggleClass('credits');

        if (!this.game.player) {
          $('body').toggleClass('death');
        }

        if ($('body').hasClass('about')) {
          this.closeInGameAbout();
          $('#helpbutton').removeClass('active');
        }
      } else {
        if (currentState !== 'animate') {
          if (currentState === 'credits') {
            this.animateParchment(currentState, this.previousState);
          } else {
            this.animateParchment(currentState, 'credits');
            this.previousState = currentState;
          }
        }
      }
    },

    toggleAbout: function () {
      var currentState = $('#parchment').attr('class');

      if (this.game.started) {
        $('#parchment').removeClass().addClass('about');
        $('body').toggleClass('about');
        if (!this.game.player) {
          $('body').toggleClass('death');
        }

        if ($('body').hasClass('credits')) {
          this.closeInGameCredits();
        }
      } else {
        if (currentState !== 'animate') {
          if (currentState === 'about') {
            if (localStorage && localStorage.data) {
              this.animateParchment(currentState, 'loadcharacter');
            } else {
              this.animateParchment(currentState, 'createcharacter');
            }
          } else {
            this.animateParchment(currentState, 'about');
            this.previousState = currentState;
          }
        }
      }
    },

    closeInGameCredits: function () {
      $('body').removeClass('credits');
      $('#parchment').removeClass('credits');
      if (!this.game.player) {
        $('body').addClass('death');
      }
    },

    closeInGameAbout: function () {
      $('body').removeClass('about');
      $('#parchment').removeClass('about');
      if (!this.game.player) {
        $('body').addClass('death');
      }

      $('#helpbutton').removeClass('active');
    },

    togglePopulationInfo: function () {
      $('#population').toggleClass('visible');
    },

    openPopup: function (type, url) {
      var h = $(window).height();
      var w = $(window).width();
      var popupHeight;
      var popupWidth;
      var top;
      var left;

      switch (type) {
      case 'twitter':
        popupHeight = 450;
        popupWidth = 550;
        break;
      case 'facebook':
        popupHeight = 400;
        popupWidth = 580;
        break;
      }

      top = (h / 2) - (popupHeight / 2);
      left = (w / 2) - (popupWidth / 2);

      var newwindow = window.open(
        url,
        'name',
        'height=' + popupHeight + ',width=' + popupWidth + ',top=' + top + ',left=' + left
      );
      if (window.focus) {newwindow.focus();}
    },

    animateParchment: function (origin, destination) {
      var self = this;
      var $parchment = $('#parchment');
      var duration = 1;

      if (this.isMobile) {
        $parchment.removeClass(origin).addClass(destination);
      } else {
        if (this.isParchmentReady) {
          if (this.isTablet) {
            duration = 0;
          }

          this.isParchmentReady = !this.isParchmentReady;

          $parchment.toggleClass('animate');
          $parchment.removeClass(origin);

          setTimeout(function () {
            $('#parchment').toggleClass('animate');
            $parchment.addClass(destination);
          }, duration * 1000);

          setTimeout(function () {
            self.isParchmentReady = !self.isParchmentReady;
          }, duration * 1000);
        }
      }
    },

    animateMessages: function () {
      var $messages = $('#notifications div');

      $messages.addClass('top');
    },

    resetMessagesPosition: function () {
      var message = $('#message2').text();

      $('#notifications div').removeClass('top');
      $('#message2').text('');
      $('#message1').text(message);
    },

    showMessage: function (message) {
      var $wrapper = $('#notifications div');
      var $message = $('#notifications #message2');

      this.animateMessages();
      $message.text(message);
      if (this.messageTimer) {
        this.resetMessageTimer();
      }

      this.messageTimer = setTimeout(function () {
        $wrapper.addClass('top');
      }, 5000);
    },

    resetMessageTimer: function () {
      clearTimeout(this.messageTimer);
    },

    resizeUi: function () {
      if (this.game) {
        if (this.game.started) {
          this.game.resize();
          this.initHealthBar();
          this.game.updateBars();
        } else {
          var newScale = this.game.renderer.getScaleFactor();
          this.game.renderer.rescale(newScale);
        }
      }
    }
  });

  return App;
});
