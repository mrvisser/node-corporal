
var _ = require('underscore');
var sprintf = require('sprintf-js').sprintf;

var CorporalUtil = require('./util');

/**
 * Convenience object for managing the list of available commands, and filtering
 * them by the current context.
 */
var CorporalCommands = module.exports = function(commandContexts) {
    this._commands = {};
    this._ctx = '';
    this._ctxs = _.extend({}, commandContexts);
};

/**
 * Get or set the current command context.
 */
CorporalCommands.prototype.ctx = function(ctx) {
    if (CorporalUtil.isDefined(ctx)) {
        this._ctx = ctx;
    }

    return this._ctx;
};

/**
 * Get *all* or one of *all* the available commands, regardless of current context.
 */
CorporalCommands.prototype.all = function(name) {
    if (CorporalUtil.isDefined(name)) {
        return this._commands[name];
    }

    return _.extend({}, this._commands);
};

/**
 * Get a current command in context, or get all the current commands in context. If
 * the command `name` does not specify the name of a command in context, this returns
 * a falsey value.
 */
CorporalCommands.prototype.get = function(name) {
    if (CorporalUtil.isDefined(name)) {
        return this.get()[name];
    }

    return _.extend({}, this._getCommandsForContext(this.ctx()), this._getCommandsForContext('*'));
};

/**
 * Add a command to the list of `all` available commands.
 */
CorporalCommands.prototype.set = function(name, command) {
    _validateCommand(name, command);
    this._commands[name] = command;
};

/*!
 * Given a context name, return all the commands available in that context.
 */
CorporalCommands.prototype._getCommandsForContext = function(ctx) {
    var self = this;
    var commands = {};
    var commandNames = (self._ctxs[ctx] && self._ctxs[ctx].commands);
    _.each(commandNames, function(commandName) {
        var command = self.all()[commandName];
        if (command) {
            commands[commandName] = command;
        }
    });

    return commands;
};

/*!
 * Validate that the provided command has all the required information needed
 * for a corporal command
 */
function _validateCommand(name, command) {
    if (!_.isString(command.description)) {
        throw new Error(sprintf('Command "%s" must have a description string', name));
    } else if (!_.isFunction(command.invoke)) {
        throw new Error(sprintf('Command "%s" must have an invoke function', name));
    }
}
