var _ = require('underscore');
var colors = require('colors');
var domain = require('domain');
var readcommand = require('readcommand');
var sprintf = require('sprintf-js').sprintf;

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
        var command = session.commands(commandName);
        if (!command) {
            // If the command did not exist, show them the command list
            // and return for the next prompt
            console.log('Invalid command: '.red + commandName.white);
            console.log('');
            return session.commands('help').invoke(session, [], next);
        }

        // Wrap the invocation into a domain to catch any errors that are thrown from the command
        var commandDomain = domain.create();
        commandDomain.on('error', function(err) {
            return _handleError(domain, err, errorHandlers, next);
        });

        commandDomain.bind(command.invoke)(session, args, function(err) {
            if (err) {
                // Pass any error to the error handler
                return _handleError(domain, err, errorHandlers, next);
            } else if (session._quit) {
                // Check if the session has been quit. If so, we call back to the master
                // and stop the command loop
                commandDomain.dispose();
                return callback();
            }

            // We didn't quit, prompt for the next command
            commandDomain.dispose();
            return next();
        });
    });
};

function _handleError(domain, err, errorHandlers, next) {
    // Get rid of the domain that caught the error
    domain.dispose();

    // Get the first applicable type
    var type = _.chain(errorHandlers.types)
        .filter(function(type) {
            return (err instanceof type);
        })
        .first()
        .value();

    if (!type) {
        throw err;
    }

    // Resolve the handler for this error based on code match in priority order
    var handlers = errorHandlers.handlers[type];
    var handler =
            _matchString(err, handlers['string']) ||
            _matchRegExp(err, handlers['regexp']) ||
            _matchFunction(err, handlers['function']) ||
            (!err.code && _.first(handlers['null']));

    // If we could not find a handler that matches this we promote the error
    if (!handler) {
        throw err;
    }

    // Invoke the handler we found
    return handler(err, next);
}

function _matchString(err, matches) {
    if (!_.isString(err.code)) {
        return;
    }

    var handler = null;
    _.each(matches, function(matchAndHandler) {
        if (_.isFunction(handler)) {
            return;
        } else if (!_.isString(matchAndHander.codeMatch)) {
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
        } else if (!_.isRegExp(matchAndHander.codeMatch)) {
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
        } else if (!_.isFunction(matchAndHander.codeMatch)) {
            return;
        } else if (matchAndHandler.codeMatch(err.code)) {
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
        var results = _.chain(session.commands())
            .keys()
            .filter(function(name) {
                return (name.indexOf(line) === 0);
            }).value();
        return callback(null, [results, line]);
    };
}
