// Load in dependencies
var expect = require('chai').expect;
var browserUtils = require('./utils/browser');
var browserMusicUtils = require('./utils/browser-music');

// Start our tests
describe('A new session with Google Music', function () {
  browserUtils.openMusic({
    testName: 'Queue test'
  });

  describe('when the queue is empty', function () {
    browserUtils.execute(function getPlaybackState () {
      return window.gmusic.queue.getSongs();
    });

    it('should report an empty queue', function () {
      expect(this.result.length).to.equal(0);
    });
  });

  describe('when we are playing music', function () {
    browserUtils.execute(function setupQueueWatcher () {
      window.gmusic.on('change:queue', function saveMode (newQueue) {
        window.queue = newQueue;
      });
    });
    browserMusicUtils.playAnything();
    browserMusicUtils.waitForPlaybackStart();
    browserUtils.execute(function getPlaybackState () {
      return window.gmusic.queue.getSongs();
    });

    it('should report a non-empty queue', function () {
      expect(this.result.length).to.not.equal(0);
    });

    it('should have fired the change event', function () {
      browserUtils.execute(function getPlaybackState () {
        return window.queue;
      });
      expect(this.result).to.be.a('array');
      expect(this.result.length).to.not.equal(0);
    });

    describe('when we clear the queue', function () {
      before(function clearQueue (done) {
        this.browser.executeAsync('window.gmusic.queue.clear(arguments[arguments.length - 1])', done);
      });
      browserUtils.execute(function getPlaybackState () {
        window.gmusic.queue.clear();
      });
      browserUtils.execute(function getPlaybackState () {
        return window.gmusic.queue.getSongs();
      });

      it('should report an empty queue', function () {
        expect(this.result.length).to.equal(0);
      });
    });
  });
});
