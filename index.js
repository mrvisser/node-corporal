var _ = require('underscore');
var fs = require('fs');
var path = require('path');

var CorporalSession = require('./lib/session');
var CorporalUtil = require('./lib/util');

var Corporal = module.exports = function(options) {
    this._options = options || {};
};

/**
 * Start the corporal command session. The callback is invoked when the user completes the session
 * with the quit command.
 */
Corporal.prototype.start = function(callback) {
    var self = this;

    callback = callback || function() {};
    var env = _.defaults({}, self._options.env, {
        'corporal_command_settings': {},
        'ps1': '> '.bold,
        'ps2': '> '
    });

    self._options.disabled = _.isArray(self._options.disabled) ? self._options.disabled : [];

    var session = new CorporalSession(env);

    // Load the internal commands
    var internalCommandsDir = path.join(__dirname, 'commands');
    _loadCommandsFromDir(session, internalCommandsDir, self._options.disabled, function(err) {
        if (err) {
            return callback(err);
        }

        // Resolve the commands provided by the consumer
        _resolveConsumerCommands(session, self._options, function(err) {
            if (err) {
                return callback(err);
            }

            // Initialize each resolved command
            _initializeCommands(session, _.values(session.commands()), function(err) {
                if (err) {
                    return callback(err);
                }

                // Begin the command loop
                return CorporalUtil.doCommandLoop(session, self._errorHandlers, callback);
            });
        });
    });
};

/**
 * Handle an error that was thrown from a command.
 *
 * @param   {Function}              type            The type function of the error to handle
 * @param   {String|Regex|Function} [codeMatch]     A matcher for a 'code' property that may be
 *                                                  present on the object. The type of matcher
 *                                                  drives selection priority in this order:
 *
 *                                                      1. String
 *                                                      2. RegExp
 *                                                      3. Function (takes a code as parameter)
 *                                                      4. No matcher present
 *
 *                                                  Secondary priority is based on registration
 *                                                  order
 * @param   {Function}              handler         The handler function for the error
 * @param   {Error}                 handler.err     The error object that was caught
 * @param   {CorporalSession}       handler.session The current corporal session
 * @param   {Function}              handler.next    The function to invoke when the next command can
 *                                                  be read from the user
 */
Corporal.prototype.onCommandError = function(/*type, [codeMatch,] handler*/) {
    // Resolve type parameters
    var type = null;
    if (_.isFunction(arguments[0])) {
        type = arguments[0];
    } else {
        throw new Error('Unexpected first argument type for onCommandError handler');
    }

    // Resolve the codeMatch and handler parameters
    var codeMatch = null;
    var handler = null;
    if ((_.isString(arguments[1]) || _.isRegExp(arguments[1]) || _.isFunction(arguments[1])) &&
        _.isFunction(arguments[2])) {
        codeMatch = arguments[1];
        handler = arguments[2];
    } else if (_.isFunction(arguments[1])) {
        handler = arguments[1];
    } else {
        throw new Error('Unexpected second argument type for onCommandError handler');
    }

    // Seed the error handlers for this type of error
    var errorHandlers = this._errorHandlers = this._errorHandlers || [];

    var handlersForType = _.findWhere(errorHandlers, {'type': type});
    if (!handlersForType) {
        handlersForType = {
            'type': type,
            'function': [],
            'null': [],
            'regexp': [],
            'string': []
        };
        errorHandlers.push(handlersForType);
    }

    if (_.isFunction(codeMatch)) {
        handlersForType['function'].push({'codeMatch': codeMatch, 'handler': handler});
    } else if (_.isRegExp(codeMatch)) {
        handlersForType['regexp'].push({'codeMatch': codeMatch, 'handler': handler});
    } else if (_.isString(codeMatch)) {
        handlersForType['string'].push({'codeMatch': codeMatch, 'handler': handler});
    } else if (!codeMatch) {
        handlersForType['null'].push({'handler': handler});
    } else {
        throw new Error('Invalid type for "codeMatch" while registering onCommandError handler');
    }
};

/*!
 * Given the corporal options, load the consumer commands based on the configuration.
 */
function _resolveConsumerCommands(session, options, callback) {
    if (_.isString(options.commands)) {
        // Load the commands from the specified string directory path
        return _loadCommandsFromDir(session, options.commands, options.disabled, callback);
    } else if (_.isObject(options.commands)) {
        // Load the commands from the explicit commands object. We filter out any command name that
        // is specified to be "disabled" in the corporal options
        _.chain(options.commands).keys().difference(options.disabled).each(function(commandName) {
            session.commands(commandName, options.commands[commandName]);
        });
        return callback();
    }

    return callback();
}

/*!
 * Load commands from JS files in a directory path.
 */
function _loadCommandsFromDir(session, dirPath, disabled, callback) {
    fs.readdir(dirPath, function(err, fileNames) {
        if (err) {
            return callback(err);
        }

        // Load each JS file as a command into the session
        _.chain(fileNames)

            // Only accept JS files
            .filter(function(fileName) {
                return (fileName.split('.').pop() === 'js');
            })

            // Pluck out the extension of the file name to get the command name
            .map(function(fileName) {
                return fileName.split('.').slice(0, -1).join('.');
            })

            // Don't accept any from the disabled list of command names
            .difference(disabled)

            // Add each command to the session
            .each(function(commandName) {
                session.commands(commandName, require(path.join(dirPath, commandName)));
            });

        return callback();
    });
}

/*!
 * Initialize each command in the given list of commands
 */
function _initializeCommands(session, commands, callback) {
    if (_.isEmpty(commands)) {
        return callback();
    }

    // Get the next command to initialize
    var command = commands.pop();
    if (!_.isFunction(command.init)) {
        // If it does not have the optional init function we just skip it
        return _initializeCommands(session, commands, callback);
    }

    // Initialize the command
    command.init(session, function(err) {
        if (err) {
            return callback(err);
        }

        // Recursively move on to the next command
        return _initializeCommands(session, commands, callback);
    });
}
