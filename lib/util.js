var _ = require('underscore');
var colors = require('colors');
var keypress = require('keypress');
var readline = require('readline');
var sprintf = require('sprintf-js').sprintf;

/**
 * Continuously prompt the user for commands while invoking each
 * command they provide. The callback is invoked when the user
 * has exited.
 */
var doCommandLoop = module.exports.doCommandLoop = function(session, callback) {
    // Start the command loop
    return _doCommandLoop(session, callback);
};

/*!
 * Recursively begin the continuous command prompt loop while invoking
 * each command provided by the user. The callback is invoked when the
 * user as exited.
 */
function _doCommandLoop(session, callback) {
    if (session._quit) {
        return callback();
    }

    _getCommand(session, function(args) {
        args = _.compact(args);
        if (_.isEmpty(args)) {
            return doCommandLoop(session, callback);
        }

        var commandName = args.shift();
        var command = session.commands(commandName);
        if (!command) {
            // If the command did not exist, show them the command list
            // and return to the command loop
            console.log('Invalid command: '.red + commandName.white);
            console.log('');
            session.commands('help').invoke(session, [], function() {
                return _doCommandLoop(session, callback);
            });
            return;
        }

        // Invoke the command
        command.invoke(session, args, function() {
            return _doCommandLoop(session, callback);
        });
    });
}

/*!
 * Recursively iterate asking for new lines from a user until the parser
 * has determined they have entered a full command
 */
function _getCommand(session, callback, _rl, _str) {
    _rl = _rl || _createReadline();
    _str = _str || '';

    var ps = (_.isEmpty(_str)) ? _ps(session, 'ps1') : _ps(session, 'ps2');
    _rl.question(ps, function(str) {
        var result = _parseArgs(_str + str);
        if (result.closed) {
            // The input closed off (i.e., user didn't pull the
            // command to the next line). So we can return the
            // parsed result
            _rl.close();
            return callback(result.args);
        }

        // Recursively get the next block of input (next line)
        return _getCommand(session, callback, _rl, result.str);
    });
}

/*!
 * Return either the ps1 or ps2 prompt label, depending on `psVar`
 */
function _ps(session, psVar) {
    return sprintf(session.env(psVar), session.env());
}

/*!
 * Create a readline object and monkey-patch it to work for
 * color prompts
 */
function _createReadline() {
    var rl = readline.createInterface({
        'input': process.stdin,
        'output': process.stdout
    });

    /* Patch the setPrompt method to properly calculate the string length */
    rl._setPrompt = rl.setPrompt;
    rl.setPrompt = function(prompt, length) {
        rl._setPrompt(prompt, (length) ? length : prompt.split(/[\r\n]/).pop().stripColors.length);
    };

    return rl;
}

/*!
 * A poor-man's state machine for reading through a command
 * character by character. Hopefully this works well enough :(
 */
function _parseArgs(str) {
    var state = {
        'CURR_ARG': '',
        'SINGLE_QUOTE': false,
        'DOUBLE_QUOTE': false,
        'ESCAPE_NEXT': false
    };

    var args = [];
    _.each(str, function(c) {
        if (state.ESCAPE_NEXT) {
            // If we are currently escaping the next character (previous
            // character was a \), then we put this character in verbatim
            // and reset the escape status
            state.CURR_ARG += c;
            state.ESCAPE_NEXT = false;
        } else if (c === '\\') {
            // We are not escaping this character and we have received the
            // backslash, signal an escape for the next character
            state.ESCAPE_NEXT = true;
        } else if (state.DOUBLE_QUOTE) {
            if (c === '"') {
                // We are currently double-quoted and we've hit a double-quote,
                // simply unflag double-quotes
                state.DOUBLE_QUOTE = false;
            } else {
                // We are currently double-quoting, take this character in
                // verbatim
                state.CURR_ARG += c;
            }
        } else if (state.SINGLE_QUOTE) {
            if (c === '\'') {
                // We are currently single-quoted and we've hit a single-quote,
                // simply unflag single-quotes
                state.SINGLE_QUOTE = false;
            } else {
                // We are currently single-quoting, take this character in
                // verbatim
                state.CURR_ARG += c;
            }
        } else if (c === ' ' || c === '\n') {
            // Any space or new-line character will terminate the argument so
            // long as it isn't escaped or in quotes
            args.push(state.CURR_ARG);
            state.CURR_ARG = '';
        } else if (c === '"') {
            // Start the double-quote flag
            state.DOUBLE_QUOTE = true;
        } else if (c === '\'') {
            // Start the single-quote flag
            state.SINGLE_QUOTE = true;
        } else {
            // Regular character under regular conditions, simply add it to the
            // current argument
            state.CURR_ARG += c;
        }
    });

    if (state.ESCAPE_NEXT) {
        // If it ended with an escape character, we exclude it since it is
        // escaping the new line in such a way that we don't retain the new
        // line in the input and we also don't escape the first character of
        // the next line
        return {'str': str.slice(0, -1), 'closed': false};
    } else if (state.DOUBLE_QUOTE || state.SINGLE_QUOTE) {
        // When we finished while quoting, we retain the new line at the end
        // of the current segment of the input string. So append it and continue
        // on
        return {'str': str + '\n', 'closed': false};
    } else {
        // We are finishing without any lingering state, so we can close off the
        // command
        args.push(state.CURR_ARG);
        return {'args': args, 'closed': true};
    }
}
