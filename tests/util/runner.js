
var _ = require('underscore');
var child = require('child_process');
var events = require('events');
var path = require('path');
var util = require('util');

var Runner = module.exports = function(commandsDir, ps1, ps2) {
    this._commands = commandsDir;
    this._ps1 = ps1 || '> ';
    this._ps2 = ps2 || '> ';
};
util.inherits(Runner, events.EventEmitter);

Runner.prototype.start = function(callback) {
    this._child = child.spawn('node', [path.join(__dirname, 'internal', 'runner.js'), '--commands', this._commands, '--ps1', this._ps1, '--ps2', this._ps2]);
    this._child.stderr.on('data', function(data) {
        this.emit('stderr', data);
    });

    this._whenPrompt(function(data) {
        return callback();
    });
};

Runner.prototype.exec = function(str, callback) {
    this._child.stdin.write(str + '\n');
    this._whenPrompt(callback);
};

Runner.prototype._whenPrompt = function(callback) {
    var that = this;
    var _data = '';
    var _onData = function(data) {
        var splitData = data.toString().split(that._ps1);
        _data += splitData[0];
        if (splitData.length === 1) {
            return that._child.stdout.once('data', _onData);
        }

        return callback(_data);
    };

    return this._child.stdout.once('data', _onData);
};

Runner.prototype.close = function() {
    this._child.kill();
};
