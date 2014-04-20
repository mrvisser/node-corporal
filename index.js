var _ = require('underscore');
var fs = require('fs');
var path = require('path');

var CorporalSession = require('./lib/session');
var CorporalUtil = require('./lib/util');

var Corporal = module.exports = function(options) {
    this._options = options || {};
};

/**
 * Start the corporal command session. The callback
 * is invoked when the user completes the session
 * with the quit command.
 */
Corporal.prototype.start = function(callback) {
    callback = callback || function() {};
    var env = _.defaults({}, this._options.env, {
        'ps1': '> '.bold,
        'ps2': '> '
    });

    var session = new CorporalSession(env);

    // Load the internal commands
    session.commands('help', require('./commands/help'));
    session.commands('quit', require('./commands/quit'));

    _resolveConsumerCommands(session, this._options, function(err) {
        if (err) {
            return callback(err);
        }

        // Begin the command loop
        return CorporalUtil.doCommandLoop(session, callback);
    });
};

/*!
 * Given the corporal options, load the consumer commands based
 * on the configuration.
 */
function _resolveConsumerCommands(session, options, callback) {
    if (_.isString(options.commands)) {
        return _loadCommandsFromDir(session, options.commands, callback);
    } else if (_.isObject(options.commands)) {
        _.each(options.commands, function(command, commandName) {
            session.commands(commandName, command);
        });
        return callback();
    }

    return callback();
}

/*!
 * Load commands from JS files in a directory path.
 */
function _loadCommandsFromDir(session, dirPath, callback) {
    fs.readdir(dirPath, function(err, fileNames) {
        if (err) {
            return callback(err);
        }

        // Load each JS file as a command into the session
        _.chain(fileNames)
            .filter(function(fileName) {
                return (fileName.split('.').pop() === 'js');
            })
            .each(function(fileName) {
                var fileNameNoExt = fileName.split('.').slice(0, -1).join('.');
                session.commands(fileNameNoExt, require(path.join(dirPath, fileNameNoExt)));
            });

        return callback();
    });
}
