
var _ = require('underscore');
var sprintf = require('sprintf-js').sprintf;

var CorporalUtil = require('./util');

var CorporalCommands = module.exports = function() {
    this._commands = {};
    this._ctx = '';
};

CorporalCommands.prototype.ctx = function(ctx) {
    if (CorporalUtil.isDefined(ctx)) {
        this._ctx = ctx;
    }

    return ctx;
};

CorporalCommands.prototype.get = function(name) {
    if (CorporalUtil.isDefined(name)) {
        return this._commands[name];
    }

    return _.extend({}, this._commands);
};

CorporalCommands.prototype.set = function(name, command) {
    _validateCommand(name, command);
    this._commands[name] = command;
};

var _validateCommand = function(name, command) {
    if (!_.isString(command.description)) {
        throw new Error(sprintf('Command "%s" must have a description string', name));
    } else if (!_.isFunction(command.invoke)) {
        throw new Error(sprintf('Command "%s" must have an invoke function', name));
    }
};
