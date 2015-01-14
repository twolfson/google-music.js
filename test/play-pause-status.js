// Load in dependencies
var expect = require('chai').expect;
var browserUtils = require('./utils/browser');

// Start our tests
describe('A new session with Google Music', function () {
  browserUtils.openMusic({killBrowser: false});
  browserUtils.execute(function getPlayPauseStatus () {
    return !!window.MusicAPI;
  });

  it('has a Google Music API', function () {
    expect(this.result).to.equal(true);
  });

  // TODO: Currently there is no default state, fix that
  it.skip('is not playing any music', function () {
    // Placeholder for linter
  });

  describe('when we are playing music', function () {
    browserUtils.execute(function setupPlaybackWatcher () {
      window.GoogleMusicApp = {
        playbackChanged: function saveMode (mode) {
          window.playbackMode = mode;
        }
      };
    });
    before(function playMusic (done) {
      // Find and click the I'm Feeling Lucky mix
      var browser = this.browser;
      browser.waitForElementByCssSelector('[data-type=imfl]', 2000, 100, function handleElement (err, el) {
        // If there was an error, callback with it
        if (err) {
          return done(err);
        }

        // Otherwise, hover the element
        browser.moveTo(el, 10, 10, function handleHover (err) {
          // If there was an error, callback with it
          if (err) {
            return done(err);
          }

          // Otherwise, click our element
          browser.click(0 /* left click */, done);
        });
      });
    });
    before(function waitForPlaybackStart (done) {
      // TODO: Wait for playback slider to move
      //   Intentionally different from play-pause button to make sure tests are good
      setTimeout(done, 1000);
    });
    browserUtils.execute(function playMusic () {
      return window.playbackMode;
    });

    it('lists the music as playing', function () {
      expect(this.result).to.equal(2 /* PLAYING */);
    });

    describe.skip('and pause it', function () {
      it('lists the music as paused', function () {
        // Placeholder for linter
      });

      describe('and when we clear the queue (aka the only way to stop)', function () {
        it('lists the music as stopped', function () {
          // Placeholder for linter
        });
      });
    });
  });
});
