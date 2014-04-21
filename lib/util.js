var _ = require('underscore');
var colors = require('colors');
var readcommand = require('readcommand');
var sprintf = require('sprintf-js').sprintf;

/**
 * Continuously prompt the user for commands while invoking each
 * command they provide. The callback is invoked when the user
 * has exited.
 */
var doCommandLoop = module.exports.doCommandLoop = function(session, callback) {
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

        // Invoke the command
        return command.invoke(session, args, function() {
            // Check if the session has been quit. If so, we call back to the master
            // and stop the command loop
            if (session._quit) {
                return callback();
            }

            // We didn't quit, prompt for the next command
            return next();
        });
    });
};

/*!
 * Return a function that returns the ps1 or ps2 prompt label, depending on `psVar`
 */
function _createPs(session, psVar) {
    return function() {
        return sprintf(session.env(psVar), session.env());
    };
}

/*!
 * Create an autocompleter function that autocompletes based on the commands in
 * the session
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
