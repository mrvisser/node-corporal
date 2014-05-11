var colors = require('colors');
var path = require('path');

var Corporal = require('../../index');
var corporal = new Corporal({

    // Commands will be loaded from JS files in the "commands" directory. Each command
    // exports an object that contains data and functions for describing and invoking
    // the command
    'commands': path.join(__dirname, 'commands'),

    // Define an initial environment:
    //  * The arbitrary "me" environment variable defines who the "current user" is
    //  * The ps1 variable pulls the current value of the "me" variable to put in the PS1 prompt
    //  * The the "colors" module is used to provide "bold" styling on the PS1
    //  * The ps2 variable is used as the prompt prefix in multi-line commands. "> " is also
    //    the default value
    'env': {
        'me': 'unknown',
        'ps1': '%(me)s$ '.bold,
        'ps2': '> '
    }
});

// Start the interactive prompt
corporal.on('load', corporal.loop);
