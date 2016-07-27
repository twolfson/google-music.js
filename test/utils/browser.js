// Load in dependencies
var assert = require('assert');
var fs = require('fs');
var asserters = require('wd/lib/asserters');
var async = require('async');
var functionToString = require('function-to-string');
var wd = require('wd');

// Resolve the compiled script
var script = fs.readFileSync(__dirname + '/../../dist/google-music.js', 'utf8');

// Extract Google Music email/password from environment variables
var GOOGLE_MUSIC_JS_EMAIL = process.env.GOOGLE_MUSIC_JS_EMAIL;
var GOOGLE_MUSIC_JS_PASSWORD = process.env.GOOGLE_MUSIC_JS_PASSWORD;

assert(
  GOOGLE_MUSIC_JS_EMAIL,
  'Username for Google Music wasn\'t set. Please set it via the GOOGLE_MUSIC_JS_EMAIL environment variable'
);
assert(
  GOOGLE_MUSIC_JS_PASSWORD,
  'Password for Google Music wasn\'t set. Please set it via the GOOGLE_MUSIC_JS_PASSWORD environment variable'
);

// Extract BrowserStack credentials from environment variables
// DEV: These are stored securely in Travis CI. Please never ever commit/push them
var BROWSERSTACK_USER = process.env.BROWSERSTACK_USER;
var BROWSERSTACK_KEY = process.env.BROWSERSTACK_KEY;
if (process.env.USE_BROWSERSTACK) {
  assert(
    BROWSERSTACK_USER,
    'Username for BrowserStack wasn\'t set. Please set it via the BROWSERSTACK_USER environment variable'
  );
  assert(
    BROWSERSTACK_KEY,
    'Access Key for BrowserStack wasn\'t set. Please set it via the BROWSERSTACK_KEY environment variable'
  );
}

// DEV: This is how long the webdriver will wait for "waitForConditionInBrowser" in ms
var ASYNC_SCRIPT_TIMEOUT = 30000;

// Define helpers for interacting with the browser
exports.openMusic = function (options) {
  // Fallback our options and default URL
  // DEV: We choose the Artists page because it has a "Shuffle" button
  //   In non-paid Google Music, there is a 15 second ad that plays for I'm Feeling Lucky radio
  //   "Shuffle artists" is a much better and faster alternative
  options = options || {};
  var url = options.url || 'https://play.google.com/music/listen#/artists';
  var testName = options.testName;
  assert(
    testName,
    'Expected `options.testName` to be provided but it was not.  Please provide a name for this test.'
  );

  // Execute many async steps
  before(function startBrowser () {
    this.browser = wd.remote();
    // Uniquely identify a browserstack build based on environment variable
    if (process.env.USE_BROWSERSTACK) {
      this.browser = wd.remote('hub.browserstack.com', 80);
    }
    global.browser = this.browser;
  });
  before(function openBrowser (done) {
    var that = this;
    // DEV: Force the Windows 8 platform as it appears to run our test more
    //      stable than other platforms
    this.browser.init({
      browserName: 'chrome',
      name: 'google-music.js - ' + testName,
      project: 'google-music.js Selenium tests',
      platform: 'WIN8',
      'browserstack.user': BROWSERSTACK_USER,
      'browserstack.key': BROWSERSTACK_KEY
    }, function setBrowserVariables () {
      // DEV: Maximize the browser window to minimize the possiblity of "element not visible erros"
      that.browser.maximize();
      that.browser.setAsyncScriptTimeout(ASYNC_SCRIPT_TIMEOUT, done);
    });
  });
  before(function navigateToMusicBeforeLogin (done) {
    this.browser.get(url, done);
  });
  before(function handleLogin (done) {
    var browser = this.browser;

    async.waterfall([
      function findSignInButton (cb) {
        browser.waitForElementByCssSelector('[data-action=signin]', asserters.isDisplayed, cb);
      },
      function clickSignInButton (el, cb) {
        el.click(cb);
      },
      function findEmailInput (cb) {
        browser.waitForElementById('Email', asserters.isDisplayed, cb);
      },
      function enterEmailIntoInput (el, cb) {
        el.type(GOOGLE_MUSIC_JS_EMAIL, cb);
      },
      function findNextButton (cb) {
        browser.waitForElementById('next', asserters.isDisplayed, cb);
      },
      function clickNextButton (el, cb) {
        el.click(cb);
      },
      function findPasswordInput (cb) {
        browser.waitForElementById('Passwd', asserters.isDisplayed, cb);
      },
      function enterPasswordIntoInput (el, cb) {
        el.type(GOOGLE_MUSIC_JS_PASSWORD, cb);
      },
      function findLoginButton (cb) {
        browser.waitForElementById('signIn', asserters.isDisplayed, cb);
      },
      function clickLoginButton (el, cb) {
        el.click(cb);
      }
    ], done);
  });
  // DEV: In some countries like Germany/infrequently used accounts, we are receiving password confirmation screen
  before(function handlePasswordConfirmation (done) {
    var browser = this.browser;

    // Wait for page navigation to complete
    setTimeout(function waitForNavigation () {
      // Determine if we are on a confirmation page
      browser.url(function handleUrl (err, currentUrl) {
        // If there was an error, callback with it
        if (err) {
          return done(err);
        }

        // Otherwise if we are on a confirmation page, then re-enter password
        // https://accounts.google.com/ServiceLogin?service=sj&continue=https%3A%2F%2Fplay.google.com%2Fmusic%2Flisten&utm_medium=signed_out_warm_welcome&welcome=0
        if (currentUrl.indexOf('continue=') !== -1) {
          async.waterfall([
            function findPasswordInput (cb) {
              browser.waitForElementById('Passwd', asserters.isDisplayed, cb);
            },
            function enterPasswordIntoInput (el, cb) {
              el.type(GOOGLE_MUSIC_JS_PASSWORD, cb);
            },
            function findLoginButton (cb) {
              browser.waitForElementById('signIn', asserters.isDisplayed, cb);
            },
            function clickLoginButton (el, cb) {
              el.click(cb);
            }
          ], done);
        } else {
          done();
        }
      });
    }, 1000);
  });
  before(function navigateToMusicAfterLogin (done) {
    this.browser.get(url, done);
  });
  before(function loadGoogleMusicConstructor (done) {
    var that = this;
    this.browser.waitForElementById('material-vslider', asserters.isDisplayed, function executeScript () {
      that.browser.execute(script, done);
    });
  });
  exports.execute(function startGoogleMusicApi () {
    window.googleMusic = new window.GoogleMusic(window);
  });

  // If we want to want to kill the session, clean it up
  // DEV: This is useful for inspecting state of a session
  var killBrowser = options.killBrowser === undefined ? true : options.killBrowser;
  if (killBrowser) {
    after(function killBrowserFn (done) {
      this.browser.quit(done);
    });
  }
  after(function cleanup () {
    delete this.browser;
  });
};

// Helper to assert we have a browser started always
exports.assertBrowser = function () {
  before(function assertBrowser () {
    assert(this.browser, '`this.browser` is not defined. Please make sure `browserUtils.openMusic()` has been run.');
  });
};

// TODO: Consider creating `mocha-wd`
exports.execute = function () {
  // Save arguments in an array
  var args = [].slice.call(arguments);

  // If the first argument is a function, coerce it to a string
  var evalFn = args[0];
  if (typeof evalFn === 'function') {
    args[0] = functionToString(evalFn).body;
  }

  // Run the mocha bindings
  exports.assertBrowser();
  before(function runExecute (done) {
    // Add on a callback to the arguments
    var that = this;
    args.push(function handleResult (err, result) {
      // Save the result and callback
      that.result = result;
      done(err);
    });

    // Execute our request
    this.browser.execute.apply(this.browser, args);
  });
  after(function cleanup () {
    delete this.result;
  });
};
