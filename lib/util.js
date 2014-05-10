var _ = require('underscore');
var colors = require('colors');
var domain = require('domain');
var readcommand = require('readcommand');
var sprintf = require('sprintf-js').sprintf;

var commandDomain = domain.create();

/**
 * Determine if the given value is defined (i.e., isn't `null` or `undefined`)
 */
var isDefined = module.exports.isDefined = function(val) {
    return (val !== null && val !== undefined);
};

/**
 * Continuously prompt the user for commands while invoking each command they provide. The callback
 * is invoked when the user has exited.
 */
var doCommandLoop = module.exports.doCommandLoop = function(session, errorHandlers, callback) {
    readcommand.loop({
        'ps1': _createPs(session, 'ps1'),
        'ps2': _createPs(session, 'ps2'),
        'autocomplete': _createAutocomplete(session)
    }, function(err, args, str, next) {
        if (err && err.code !== 'SIGINT') {
            // An unexpected error occurred
            throw err;
        } else if (err) {
            // User hit CTRL+C, just clear the prompt and jump to the next command
            return next();
        }

        args = _.compact(args);
        if (_.isEmpty(args)) {
            return next();
        }

        var commandName = args.shift();
        var command = session.commands().get(commandName);
        if (!command) {
            // If the command did not exist, show them the command list
            // and return for the next prompt
            console.log('Invalid command: '.red + commandName.white);
            console.log('');
            return session.commands().get('help').invoke(session, [], next);
        }

        // Wrap the invocation into a domain to catch any errors that are thrown from the command
        commandDomain = domain.create();
        commandDomain.once('error', function(err) {
            return _handleError(err, session, errorHandlers, next);
        });

        commandDomain.enter();
        command.invoke(session, args, function(err) {
            if (err) {
                // Pass any error to the error handler
                return _handleError(err, session, errorHandlers, next);
            } else if (session._quit) {
                // Check if the session has been quit. If so, we call back to the master
                // and stop the command loop
                commandDomain.exit();
                return callback();
            }

            // We didn't quit, prompt for the next command
            commandDomain.exit();
            return next();
        });
    });
};

function _handleError(err, session, errorHandlers, next) {
    // Get rid of the domain that caught the error
    commandDomain.exit();

    // Get the first applicable handler
    var handlersForType = _.chain(errorHandlers)
        .filter(function(handlersForType) {
            return (err instanceof handlersForType.type);
        })
        .first()
        .value();
    if (!handlersForType) {
        throw err;
    }

    // Resolve the handler for this error based on code match in priority order
    var handler =
        _matchString(err, handlersForType['string']) ||
        _matchRegExp(err, handlersForType['regexp']) ||
        _matchFunction(err, handlersForType['function']) ||
        _matchNull(err, handlersForType['null']);

    // If we could not find a handler that matches this we promote the error
    if (!handler) {
        throw err;
    }

    // Invoke the handler we found
    return handler(err, session, next);
}

function _matchString(err, matches) {
    if (!_.isString(err.code)) {
        return;
    }

    var handler = null;
    _.each(matches, function(matchAndHandler) {
        if (_.isFunction(handler)) {
            return;
        } else if (!_.isString(matchAndHandler.codeMatch)) {
            return;
        } else if (err.code === matchAndHandler.codeMatch) {
            handler = matchAndHandler.handler;
        }
    });

    return (_.isFunction(handler)) ? handler : null;
}

function _matchRegExp(err, matches) {
    if (!_.isString(err.code)) {
        return;
    }

    var handler = null;
    _.each(matches, function(matchAndHandler) {
        if (_.isFunction(handler)) {
            return;
        } else if (!_.isRegExp(matchAndHandler.codeMatch)) {
            return;
        } else if (matchAndHandler.codeMatch.test(err.code)) {
            handler = matchAndHandler.handler;
        }
    });

    return (_.isFunction(handler)) ? handler : null;
}

function _matchFunction(err, matches) {
    var handler = null;
    _.each(matches, function(matchAndHandler) {
        if (_.isFunction(handler)) {
            return;
        } else if (!_.isFunction(matchAndHandler.codeMatch)) {
            return;
        } else if (matchAndHandler.codeMatch(err.code)) {
            handler = matchAndHandler.handler;
        }
    });

    return (_.isFunction(handler)) ? handler : null;
}

function _matchNull(err, matches) {
    var handler = null;
    _.each(matches, function(matchAndHandler) {
        if (_.isFunction(handler)) {
            return;
        } else if (!_.isFunction(matchAndHandler.handler)) {
            return;
        } else {
            handler = matchAndHandler.handler;
        }
    });

    return (_.isFunction(handler)) ? handler : null;
}

/*!
 * Return a function that returns the ps1 or ps2 prompt label, depending on `psVar`
 */
function _createPs(session, psVar) {
    return function() {
        return sprintf(session.env(psVar), session.env());
    };
}

/*!
 * Create an autocompleter function that autocompletes based on the commands in the session
 */
function _createAutocomplete(session) {
    return function(rl, line, callback) {
        var results = _.chain(session.commands().get())
            .keys()
            .filter(function(name) {
                return (name.indexOf(line) === 0);
            }).value();
        return callback(null, [results, line]);
    };
}
