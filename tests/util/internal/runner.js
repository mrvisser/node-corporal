
var argv = require('optimist').argv;
var Corporal = require('../../../index');

new Corporal({
    'commands': argv.commands,
    'env': {
        'ps1': argv.ps1,
        'ps2': argv.ps2
    }
}).start(function(err) {
    if (err) {
        return process.exit(1);
    }

    return process.exit(0);
});
