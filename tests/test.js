
var assert = require('assert');

var CorporalTestRunner = require('./util/runner');

describe('Built-in Commands', function() {
    describe('help', function() {
        it('lists the help and quit command when run without arguments', function(callback) {
            var runner = new CorporalTestRunner();
            runner.start(function() {
                runner.exec('help', function(data) {
                    assert.notEqual(data.indexOf('help:  Show a dialog of all available commands.'), -1);
                    assert.notEqual(data.indexOf('quit:  Quit the interactive shell.'), -1);
                    return callback();
                });
            });
        });
    });
});
