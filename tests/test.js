
var _ = require('underscore');
var assert = require('assert');
var path = require('path');

var CorporalTestRunner = require('./util/runner');

var _currentRunners = [];


/*!
 * Kill all runners that were created in the previous test
 */
afterEach(function(callback) {
    _.each(_currentRunners, function(runner) {
        runner.close();
    });
    _currentRunners = [];
    return callback();
});

describe('Command Loading', function() {

    it('loads commands from a directory', function(callback) {
        var runner = _createRunner({'commands': _commandDir('loads-commands-from-a-directory')});
        runner.start(function() {
            runner.exec('help', function(data) {
                assert.notEqual(data.indexOf('help    :  Show a dialog of all available commands.'), -1);
                assert.notEqual(data.indexOf('quit    :  Quit the interactive shell.'), -1);
                assert.notEqual(data.indexOf('command1:  command1.'), -1);
                assert.notEqual(data.indexOf('command2:  command2.'), -1);
                return callback();
            });
        });
    });

    it('fails when a command without a description is encountered', function(callback) {
        var runner = _createRunner({'commands': _commandDir('fails-when-a-command-without-a-description-is-encountered')});
        runner.start(function() {});

        // Keep track of all stderr output from the process. We are listening for an error
        var stderr = '';
        runner.on('stderr', function(data) {
            stderr += data;
        });

        runner.on('close', function(code) {
            assert.strictEqual(code, 8);
            assert.notEqual(stderr.indexOf('Command "no-description" must have a description string'), -1);
            return callback();
        });
    });

    it('fails when a command without an invoke method is encountered', function(callback) {
        var runner = _createRunner({'commands': _commandDir('fails-when-a-command-without-an-invoke-method-is-encountered')});
        runner.start(function() {});

        // Keep track of all stderr output from the process. We are listening for an error
        var stderr = '';
        runner.on('stderr', function(data) {
            stderr += data;
        });

        runner.on('close', function(code) {
            assert.strictEqual(code, 8);
            assert.notEqual(stderr.indexOf('Command "no-invoke-method" must have an invoke function'), -1);
            return callback();
        });
    });

    it('does not load commands that are disabled', function(callback) {
        // Load from a directory with a failing command while disabling the failing command
        var runner1 = _createRunner({
            'commands': _commandDir('fails-when-a-command-without-an-invoke-method-is-encountered'),
            'disabled': ['no-invoke-method']
        });
        runner1.start(function() {
            runner1.exec('help', function(data) {
                assert.strictEqual(data.indexOf('no-invoke-method'), -1);
                assert.notEqual(data.indexOf('command1:  command1.'), -1);

                // Load another one, but disable both clear and no-invoke-method
                var runner2 = _createRunner({
                    'commands': _commandDir('fails-when-a-command-without-an-invoke-method-is-encountered'),
                    'disabled': ['clear', 'no-invoke-method']
                });
                runner2.start(function() {
                    runner2.exec('help', function(data) {
                        assert.strictEqual(data.indexOf('clear'), -1);
                        assert.strictEqual(data.indexOf('no-invoke-method'), -1);
                        assert.notEqual(data.indexOf('command1:  command1.'), -1);
                        return callback();
                    });
                });
            });
        });
    });
});

describe('Built-In Commands', function() {

    describe('non-existing', function() {

        it('provides an error and lists commands when a non-existing command is entered', function(callback) {
            var runner = _createRunner();
            runner.start(function() {
                runner.exec('bleh', function(data) {
                    assert.notEqual(data.indexOf('Invalid command:'), -1);
                    assert.notEqual(data.indexOf('bleh'), -1);
                    return callback();
                });
            });
        });
    });

    describe('clear', function() {

        it('executes the clear-screen control characters when invoked', function(callback) {
            var runner = _createRunner();
            runner.start(function() {
                runner.exec('clear', function(data) {
                    assert.strictEqual(data, '\u001B[2J\u001B[0;0f');
                    return callback();
                });
            });
        });
    });

    describe('help', function() {

        it('lists the help and quit command when run without arguments', function(callback) {
            var runner = _createRunner();
            runner.start(function() {
                runner.exec('help', function(data) {
                    assert.notEqual(data.indexOf('clear:  Clear the terminal window.'), -1);
                    assert.notEqual(data.indexOf('help :  Show a dialog of all available commands.'), -1);
                    assert.notEqual(data.indexOf('quit :  Quit the interactive shell.'), -1);
                    return callback();
                });
            });
        });

        it('lists the help and usage of the quit command', function(callback) {
            var runner = _createRunner();
            runner.start(function() {
                runner.exec('help quit', function(data) {
                    assert.notEqual(data.indexOf('Quit the interactive shell.'), -1);
                    return callback();
                });
            });
        });

        it('lists the help and usage of the help command', function(callback) {
            var runner = _createRunner();
            runner.start(function() {
                runner.exec('help help', function(data) {
                    assert.notEqual(data.indexOf('Show a dialog of all available commands.'), -1);
                    assert.notEqual(data.indexOf('Usage: help [<command>]'), -1);
                    return callback();
                });
            });
        });

        it('hides commands from the command listing when configured to do so', function(callback) {
            // Hide the "clear" command from the index
            var runner = _createRunner({
                'env': {
                    'corporal_command_settings': {
                        'help': {
                            'hide': ['clear']
                        }
                    }
                }
            });
            runner.start(function() {
                runner.exec('help', function(data) {
                    // Ensure it shows help and quit
                    assert.notEqual(data.indexOf('help:  Show a dialog of all available commands.'), -1);
                    assert.notEqual(data.indexOf('quit:  Quit the interactive shell.'), -1);

                    // Ensure it does not show clear
                    assert.strictEqual(data.indexOf('clear'), -1);

                    // Ensure it does show the help for clear when specifically requested
                    runner.exec('help clear', function(data) {
                        assert.notEqual(data.indexOf('Clear the terminal window.'), -1);
                        return callback();
                    });
                });
            });
        });
    });

    describe('quit', function() {

        it('quits the process', function(callback) {
            var runner = _createRunner();
            runner.start(function() {
                runner.exec('quit');
                runner.once('close', function(code, signal) {
                    assert.strictEqual(code, 0);
                    return callback();
                });
            });
        });
    });
});

describe('Error Handling', function() {

    it('handles precedence use-cases for error type and code', function(callback) {
        var runner = _createRunner({'commands': _commandDir('error-handler-resolution')});
        runner.start(function() {

            // Verify all precedence use-cases based on error type and code
            runner.exec('throw-typea-stringmatch', function(data) {
                assert.strictEqual(data, 'TypeAError: isastringmatch\n');
                runner.exec('throw-typea-regexpmatch', function(data) {
                    assert.strictEqual(data, 'TypeAError: isaregexpmatch\n');
                    runner.exec('throw-typea-functionmatch', function(data) {
                        assert.strictEqual(data, 'TypeAError: isafunctionmatch\n');
                        runner.exec('throw-typea-nomatch', function(data) {
                            assert.strictEqual(data, 'TypeAError: isanullmatch 0\n');
                            runner.exec('throw-typea-nocode', function(data) {
                                assert.strictEqual(data, 'TypeAError: isanullmatch 0\n');
                                runner.exec('throw-typea-stringmatch-ordermatters', function(data) {
                                    assert.strictEqual(data, 'TypeAError: teststringprecedence 0\n');
                                    runner.exec('throw-typea-regexpmatch-ordermatters', function(data) {
                                        assert.strictEqual(data, 'TypeAError: testregexpprecedence 0\n');
                                        runner.exec('throw-typea-functionmatch-ordermatters', function(data) {
                                            assert.strictEqual(data, 'TypeAError: testfunctionprecedence 0\n');
                                            runner.exec('throw-typeb-stringmatch', function(data) {
                                                assert.strictEqual(data, 'TypeBError: isastringmatch\n');
                                                runner.exec('throw-error-stringmatch', function(data) {
                                                    assert.strictEqual(data, 'Error: isastringmatch\n');
                                                    runner.exec('throw-catchall', function(data) {
                                                        assert.strictEqual(data, 'Error: catchall\n');

                                                        // Ensure we can still somewhat operate and exit properly
                                                        runner.exec('help', function(data) {
                                                            assert.notEqual(data.indexOf('Clear the terminal window.'), -1);
                                                            assert.notEqual(data.indexOf('Show a dialog of all available commands.'), -1);
                                                            assert.notEqual(data.indexOf('Quit the interactive shell.'), -1);
                                                            runner.exec('quit');
                                                            runner.once('close', function(code, signal) {
                                                                assert.strictEqual(code, 0);
                                                                return callback();
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

describe('Command Contexts', function() {
    it('only makes commands available that are scoped to the current context', function(callback) {
        var runner = _createRunner({
            'commands': _commandDir('command-contexts'),
            'contexts': {
                '': ['available-in-default-context'],
                '*': ['switch-context'],
                'contexta': ['available-in-contexta'],
                'contextb': ['available-in-contextb']
            }
        });

        runner.start(function() {
            // Ensure only the internal, * commands and those specified for the default context are available in the default context
            runner.exec('help', function(data) {
                assert.notEqual(data.indexOf('available-in-default-context:'), -1);
                assert.notEqual(data.indexOf('switch-context              :'), -1);
                assert.notEqual(data.indexOf('clear                       :'), -1);
                assert.notEqual(data.indexOf('help                        :'), -1);
                assert.notEqual(data.indexOf('quit                        :'), -1);
                assert.strictEqual(data.indexOf('contexta'), -1);
                assert.strictEqual(data.indexOf('contextb'), -1);

                // Ensure we can't invoke any of the commands out of context
                runner.exec('available-in-contexta', function(data) {
                    assert.notEqual(data.indexOf('Invalid command'), -1);

                    // Ensure we can invoke the default context command
                    runner.exec('available-in-default-context', function(data) {
                        assert.strictEqual(data.indexOf('Invalid command'), -1);

                        // Switch contexts
                        runner.exec('switch-context contexta', function(data) {

                            // Ensure we only get internal, * and contexta commands
                            runner.exec('help', function(data) {
                                assert.notEqual(data.indexOf('available-in-contexta:'), -1);
                                assert.notEqual(data.indexOf('switch-context       :'), -1);
                                assert.notEqual(data.indexOf('clear                :'), -1);
                                assert.notEqual(data.indexOf('help                 :'), -1);
                                assert.notEqual(data.indexOf('quit                 :'), -1);
                                assert.strictEqual(data.indexOf('default'), -1);
                                assert.strictEqual(data.indexOf('contextb'), -1);

                                // Ensure we can't invoke the default context command
                                runner.exec('available-in-default-context', function(data) {
                                    assert.notEqual(data.indexOf('Invalid command'), -1);

                                    // Ensure we can now invoke contexta
                                    runner.exec('available-in-contexta', function(data) {
                                        assert.strictEqual(data.indexOf('Invalid command'), -1);
                                        return callback();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

/*!
 * Creates a runner and keeps track of it to be closed after the
 * test.
 */
function _createRunner(options) {
    var runner = new CorporalTestRunner(options);
    _currentRunners.push(runner);
    return runner;
}

/*!
 * Convenience method to get a comamnds directory by bottom-level
 * folder name
 */
function _commandDir(dir) {
    return path.join(__dirname, 'commands', dir);
}
