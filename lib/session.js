var _ = require('underscore');
var sprintf = require('sprintf-js').sprintf;

var CorporalCommands = require('./commands');
var CorporalUtil = require('./util');

var CorporalSession = module.exports = function(options) {
    options = options || {};
    this._commands = new CorporalCommands(options.commandContexts);
    this._env = options.env || {};
    this._errorHandlers = options.errorHandlers || [];
    this._stdout = options.stdout || process.stdout;
    this._stderr = options.stderr || process.stderr;
    this._stdin = options.stdin || process.stdin;
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

CorporalSession.prototype.errorHandlers = function(errorHandlers) {
    if (errorHandlers) {
        this._errorHandlers = errorHandlers;
    }

    return this._errorHandlers;
};

CorporalSession.prototype.stdout = function(stdout) {
    if (stdout) {
        this._stdout = stdout;
    }

    return this._stdout;
};

CorporalSession.prototype.stderr = function(stderr) {
    if (stderr) {
        this._stderr = stderr;
    }

    return this._stderr;
};

CorporalSession.prototype.stdin = function(stdin) {
    if (stdin) {
        this._stdin = stdin;
    }

    return this._stdin;
};

CorporalSession.prototype.quit = function() {
    this._quit = true;
};
