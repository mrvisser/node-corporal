var _ = require('underscore');
var events = require('events');
var fs = require('fs');
var path = require('path');
var util = require('util');

var CorporalSession = require('./lib/session');
var CorporalUtil = require('./lib/util');

/**
 * Create a corporal object that can be used to start a prompt loop or invoke adhoc commands.
 *
 * @param   {Object}            options                     The corporal options
 * @param   {String|Object}     options.commands            A string pointing to a directory from
 *                                                          which to load commands, or an object
 *                                                          keyed by command name whose value are
 *                                                          command implementation objects
 * @param   {String[]}          [options.disabled]          A list of command names to disable
 *                                                          for the session
 * @param   {Object}            [options.env]               The initial environment to use for the
 *                                                          session
 * @param   {Object}            [options.commandContexts]   The command contexts to be made
 *                                                          available throughout the session. The
 *                                                          initial context name/key is the empty
 *                                                          string
 * @param   {Object}            [options.streams]           An object holding the different streams
 *                                                          to use for input and output
 * @param   {Stream}            [options.streams.stdout]    The standard output stream
 * @param   {Stream}            [options.streams.stderr]    The standard error stream
 * @param   {Stream}            [options.streams.stdin]     The standard input stream
 */
var Corporal = module.exports = function(options) {
    var self = this;

    options = _.extend({}, options);
    options.disabled = options.disabled || [];
    options.env = options.env || {};

    _.defaults(options.env, {
        'corporal_command_settings': {},
        'ps1': '> '.bold,
        'ps2': '> '
    });

    var internalCommandsDir = path.join(__dirname, 'commands');
    _loadCommandsFromDir(internalCommandsDir, options.disabled, function(err, internalCommands) {
        if (err) {
            return self.emit('error', err);
        }

        // Resolve the commands provided by the consumer
        _resolveConsumerCommands(options, function(err, consumerCommands) {
            if (err) {
                return self.emit('error', err);
            }

            // Merge the internal commands with consumer commands to get all available commands
            var allCommands = _.extend({}, internalCommands, consumerCommands);

            // Seed the command context, ensuring that our internal commands always available in all
            // contexts
            var commandContexts = null;
            if (!options.commandContexts) {
                // If there is no configuration for command contexts, then all commands are simply
                // available at all times
                commandContexts = {'*': {'commands': _.keys(allCommands)}};
            } else {
                // If there is a configuration for command contexts, all we need to do is make sure
                // that the internal commands are always available (i.e., clear, help and quit)
                commandContexts = options.commandContexts;
                commandContexts['*'] = commandContexts['*'] || {};
                commandContexts['*'].commands = commandContexts['*'].commands || [];
                commandContexts['*'].commands = _.union(commandContexts['*'].commands, _.keys(internalCommands));
            }

            self._session = new CorporalSession({
                'env': options.env,
                'commandContexts': commandContexts,
                'stdout': options.stdout,
                'stderr': options.stderr,
                'stdin': options.stdin
            });

            _.each(allCommands, function(command, name) {
                self._session.commands().set(name, command);
            });

            // Initialize each resolved command
            _initializeCommands(self._session, function(err) {
                if (err) {
                    return self.emit('error', err);
                }

                return self.emit('load');
            });
        });
    });
};
util.inherits(Corporal, events.EventEmitter);

/**
 * Start a prompt loop for the user
 *
 * @param   {Function}  [callback]  Invoked when the user quits the prompt session
 */
Corporal.prototype.loop = function(callback) {
    callback = callback || function() {};

    // Apply all known error handlers to the session
    this._session.errorHandlers(this._errorHandlers);

    // Begin the command loop
    return CorporalUtil.doCommandLoop(this._session, callback);
};

/**
 * Invoke a command programatically with the current session
 *
 * @param   {String}    commandName     The name of the command to invoke
 * @param   {String[]}  [args]          The array of arguments (i.e., argv) with which to invoke the
 *                                      command
 * @param   {Function}  [callback]      Invoked when the command completes
 */
Corporal.prototype.exec = function(commandName, args, callback) {
    if (_.isArray(args)) {
        callback = callback || function() {};
    } else if (_.isFunction(args)) {
        args = [];
        callback = args;
    } else {
        args = [];
        callback = callback || function() {};
    }

    // Apply all known error handlers to the session
    this._session.errorHandlers(this._errorHandlers);

    // Invoke the command with the current session
    return CorporalUtil.invokeCommand(this._session, commandName, args, callback);
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
function _resolveConsumerCommands(options, callback) {
    var commands = {};
    if (_.isString(options.commands)) {
        // Load the commands from the specified string directory path
        return _loadCommandsFromDir(options.commands, options.disabled, callback);
    } else if (_.isObject(options.commands)) {
        // Load the commands from the explicit commands object. We filter out any command name that
        // is specified to be "disabled" in the corporal options
        _.chain(options.commands).keys().difference(options.disabled).each(function(commandName) {
            commands[commandName] = options.commands[commandName];
        });
    }

    return callback(null, commands);
}

/*!
 * Load commands from JS files in a directory path.
 */
function _loadCommandsFromDir(dirPath, disabled, callback) {
    var commands = {};
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
                commands[commandName] = require(path.join(dirPath, commandName));
            });

        return callback(null, commands);
    });
}

/*!
 * Initialize each command in the given list of commands
 */
function _initializeCommands(session, callback, _commands) {
    _commands = _commands || _.values(session.commands().all());
    if (_.isEmpty(_commands)) {
        return callback();
    }

    // Get the next command to initialize
    var command = _commands.pop();
    if (!_.isFunction(command.init)) {
        // If it does not have the optional init function we just skip it
        return _initializeCommands(session, callback, _commands);
    }

    // Initialize the command
    command.init(session, function(err) {
        if (err) {
            return callback(err);
        }

        // Recursively move on to the next command
        return _initializeCommands(session, callback, _commands);
    });
}
