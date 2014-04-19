
var argv = require('optimist').argv;
var Corporal = require('../../../index');

new Corporal({
    'commands': argv.commands,
    'env': {
        'ps1': argv.ps1,
        'ps2': argv.ps2
    }
}).start();
