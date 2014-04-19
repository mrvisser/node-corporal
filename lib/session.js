var _ = require('underscore');

var CorporalSession = module.exports = function(env, commands) {
    this._env = env || {};
    this._commands = commands || {};
    _validateCommands(this._commands);
};

CorporalSession.prototype.env = function(key, val) {
    if (_isDefined(key) && val !== undefined) {
        this._env[key] = val;
    } else if (_isDefined(key)) {
        return this._env[key];
    } else {
        return this._env;
    }
};

CorporalSession.prototype.commands = function(name, command) {
    if (_.isString(name) && _.isObject(command)) {
        _validateCommand(command, name);
        this._commands[name] = command;
    } else if (_.isString(name)) {
        return this._commands[name];
    } else {
        return _.extend({}, this._commands);
    }
};

CorporalSession.prototype.quit = function() {
    this._quit = true;
};

var _isDefined = function(val) {
    return (val !== null && val !== undefined);
};

var _validateCommands = function(commands) {
    _.each(commands, _validateCommand);
};

var _validateCommand = function(command, commandName) {
    if (!_.isString(command.description)) {
        throw new Error(sprintf('Command "%s" must have a description string', commandName));
    } else if (!_.isFunction(command.invoke)) {
        throw new Error(sprintf('Command "%s" must have an invoke function', commandName));
    }
};
