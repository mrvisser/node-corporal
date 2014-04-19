var _ = require('underscore');
var sprintf = require('sprintf-js').sprintf;

module.exports = {
    'description': _getDescription(),
    'help': sprintf('Usage: %s', _getOptimist().help()),
    'invoke': function(session, args, callback) {
        var argv = _getOptimist().parse(args);
        var commandName = argv._[0];
        if (commandName) {
            var command = session.commands(commandName);
            if (command) {
                console.log('');
                console.log(command.description);
                console.log('');

                if (_.isString(command.help)) {
                    process.stdout.write(command.help);
                }
            } else {
                console.log('No command found with name: "%s"', commandName);
            }
        } else {
            console.log('List of available commands:');
            console.log('');

            // Determine the width of the command name column:
            var longestName = 0;
            _.each(session.commands(), function(command, commandName) {
                longestName = Math.max(commandName.length, longestName);
            });

            _.each(session.commands(), function(command, commandName) {
                console.log(sprintf('%-' + longestName + 's:  %s', commandName, command.description.split('\n')[0]));
            });
            console.log('');
        }

        return callback();
    }
};

function _getDescription() {
    return 'Show a dialog of all available commands.';
}

function _getOptimist() {
    return require('optimist').usage('help [<command>]');
}
