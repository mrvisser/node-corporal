var _ = require('underscore');
var sprintf = require('sprintf-js').sprintf;

var CorporalCommands = require('./commands');
var CorporalUtil = require('./util');

var CorporalSession = module.exports = function(options) {
    options = options || {};
    this._env = options.env || {};
    this._commands = new CorporalCommands(options.commandContexts);
};

CorporalSession.prototype.commands = function() {
    return this._commands;
};

CorporalSession.prototype.env = function(key, val) {
    if (CorporalUtil.isDefined(key) && val !== undefined) {
        this._env[key] = val;
    } else if (CorporalUtil.isDefined(key)) {
        return this._env[key];
    } else {
        return this._env;
    }
};

CorporalSession.prototype.quit = function() {
    this._quit = true;
};
