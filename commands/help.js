var _ = require('underscore');
var sprintf = require('sprintf-js').sprintf;

/**
 * Help command.
 *
 * Shows a dialog of all available commands. The help command can be configured with the following
 * settings from the standard `corporal_command_settings` environment variable:
 *
 *  ## corporal_command_settings
 *
 *      * `help.hide`:  A string array indicating the command names to omit when listing the
 *                      available commands. The commands will not be ommitted when the command
 *                      is run explicitly indicating the command name. E.g., if you hide `clear`,
 *                      if the user executes `help clear`, the help content for clear will still
 *                      be displayed. This setting only impacts the help list index.
 */
module.exports = {
    'description': _getDescription(),
    'help': sprintf('Usage: %s', _getOptimist().help()),
    'init': function(session, callback) {
        var allSettings = session.env('corporal_command_settings');
        var helpSettings = allSettings.help = _.isObject(allSettings.help) ?
            allSettings.help : {};

        // Ensure the `hide` setting is set in the help settings
        helpSettings.hide = (_.isArray(helpSettings.hide)) ? helpSettings.hide : [];

        return callback();
    },
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
                    console.log(command.help);
                    console.log('');
                }
            } else {
                console.log('No command found with name: "%s"', commandName);
            }
        } else {
            console.log('List of available commands:');
            console.log('');

            var settings = session.env('corporal_command_settings').help;

            // Determine the width of the command name column
            var longestNameLength = 0;
            _.chain(session.commands())
                .keys()
                .difference(settings.hide)
                .map(function(commandName) {
                    return commandName.length;
                })
                .each(function(currentLength) {
                    longestNameLength = Math.max(currentLength, longestNameLength);
                });

            // Output each command (that isn't hidden from the index) to the console
            _.chain(session.commands())
                .keys()
                .difference(settings.hide)
                .each(function(commandName) {
                    var command = session.commands(commandName);
                    console.log(sprintf('%-' + longestNameLength + 's:  %s', commandName, command.description.split('\n')[0]));
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

function _getSettings(session) {
    var env = session.env();

    var settings = _.extend({}, session.env('help'));
    settings = (_.isArray(settings.hide)) ? settings.hide : [];
    return settings;
}
