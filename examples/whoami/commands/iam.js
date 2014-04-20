var optimist = require('optimist');

module.exports = {

    // Required: Defines a description for the command that can be seen in command listings
    // and help dialogs
    'description': 'Tell the session who you are.',

    // Optional: Additional text to show how the command can be used. Can be multi-line, etc...
    'help': 'Usage: iam <name>',

    // The function that actually invokes the command. Optimist is being used here to parse
    // the array arguments that were provided to your command, however you can use whatever
    // utility you want
    'invoke': function(session, args, callback) {

        // Parse the arguments using optimist
        var argv = optimist.parse(args);

        // Update the environment to indicate who the specified user now is
        session.env('me', argv._[0] || 'unknown');

        // The callback always needs to be invoked to finish the command
        return callback();
    }
};
