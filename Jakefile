var browserify = require('browserify')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , assert = require('assert')
  , cpr = require('cpr')
  , fs = require('fs')
  , FIXTURE_DIR = path.join(__dirname, 'test', 'fixtures')
  , BUILD_DIR = path.join(__dirname, 'test', 'build')
  , BUILD_FILE = path.join(BUILD_DIR, 'bundle.js')
  , ENTRY_SCRIPT = path.join(FIXTURE_DIR, 'main.js')
  , PICKER_CSS_IN = path.join(__dirname, 'picker.css')
  , PICKER_CSS_OUT = path.join(BUILD_DIR, 'picker.css')
  , HARNESS_CSS_IN = path.join(FIXTURE_DIR, 'harness.css')
  , HARNESS_CSS_OUT = path.join(BUILD_DIR, 'harness.css')
  , HARNESS_IMG_IN = path.join(__dirname, 'img')
  , HARNESS_IMG_OUT = path.join(BUILD_DIR, 'img')
  , TEST_HARNESS_IN = path.join(FIXTURE_DIR, 'harness.html')
  , TEST_HARNESS_OUT = path.join(BUILD_DIR, 'index.html');

desc('Creates the test bundle');
task('test', {async: true}, function () {
  var bundle = new browserify()
    , out = fs.createWriteStream(BUILD_FILE);

  mkdirp(BUILD_DIR, function (err) {
    assert.ifError(err);

    // Bundle files
    bundle
      .add(ENTRY_SCRIPT)
      .bundle({debug: true})
      .pipe(out)
      .on('close', function () {
    // Copy in HTML
        fs.createReadStream(TEST_HARNESS_IN)
          .pipe(fs.createWriteStream(TEST_HARNESS_OUT))
          .on('close', function () {
    // Copy in harness CSS
            fs.createReadStream(HARNESS_CSS_IN)
              .pipe(fs.createWriteStream(HARNESS_CSS_OUT))
              .on('close', function () {
    // Copy in picker CSS
                fs.createReadStream(PICKER_CSS_IN)
                  .pipe(fs.createWriteStream(PICKER_CSS_OUT))
                  .on('close', function () {
    // Copy in images
                    cpr(HARNESS_IMG_IN, HARNESS_IMG_OUT, {
                      deleteFirst: true
                    , overwrite: true
                    , confirm: true
                    }, function (err) {
                      assert.ok(err == null);
                      complete();
                    });
                  });
              });
          });
      });
    })
});
