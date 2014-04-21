
var _ = require('underscore');
var child = require('child_process');
var events = require('events');
var path = require('path');
var util = require('util');

/**
 * Create a runner that can be used to start a process running the
 * corporal interactive shell utility
 */
var Runner = module.exports = function(options) {
    this._options = options || {};
    this._options.env = _.defaults({}, this._options.env, {
        'ps1': '> ',
        'ps2': '> '
    });
};
util.inherits(Runner, events.EventEmitter);

/**
 * Begin the corporal process and invoke the callback when
 * the first prompt is given for input
 */
Runner.prototype.start = function(callback) {
    var self = this;

    // The args for the corporal process fork
    var args = [path.join(__dirname, 'internal', 'runner.js')];

    // Apply the session environment
    args.push('--env', JSON.stringify(self._options.env));

    if (self._options.commands) {
        args.push('--commands', self._options.commands);
    }

    if (self._options.disabled) {
        args.push('--disabled', self._options.disabled.join(','));
    }

    if (process.env['CORPORAL_TEST_VERBOSE']) {
        console.log('spawn: %s', JSON.stringify(_.union('node', args), null, 2));
    }

    // Spawn the corporal process
    self._child = child.spawn('node', args);

    // Pass stdout, stderr and close events to the runner so consumers can listen
    self._child.stdout.on('data', function(data) {
        if (process.env['CORPORAL_TEST_VERBOSE']) {
            console.log('runner stdout: %s', data);
        }
        self.emit('stdout', data);
    });
    self._child.stderr.on('data', function(data) {
        if (process.env['CORPORAL_TEST_VERBOSE']) {
            console.log('runner stderr: %s', data);
        }
        self.emit('stderr', data);
    });
    self._child.on('close', function(code, signal) { self.emit('close', code, signal); });

    // When the next prompt occurs, return to the caller
    self._whenPrompt(function(data) {
        return callback();
    });
};

/**
 * Invoke a command and wait for the next prompt to be given
 */
Runner.prototype.exec = function(str, callback) {
    callback = callback || function(){};
    this._child.stdin.write(str + '\n');
    this._whenPrompt(callback);
};

/*!
 * Wait for the next prompt to be given by the process, then invoke the
 * callback
 */
Runner.prototype._whenPrompt = function(callback) {
    var self = this;

    var _data = '';
    var _onData = function(data) {
        var splitData = data.toString().split(self._options.env.ps1);
        _data += splitData[0];
        if (splitData.length === 1) {
            return self._child.stdout.once('data', _onData);
        }

        return callback(_data);
    };

    return self._child.stdout.once('data', _onData);
};

/**
 * Close the runner and associated process
 */
Runner.prototype.close = function() {
    this._child.kill();
};
