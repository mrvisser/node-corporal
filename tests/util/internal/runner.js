
var _ = require('underscore');
var argv = require('optimist').argv;
var Corporal = require('../../../index');

new Corporal({
    'commands': argv.commands,
    'disabled': _.isString(argv.disabled) ? argv.disabled.split(',') : null,
    'env': JSON.parse(argv.env)
}).start(function(err) {
    if (err) {
        return process.exit(1);
    }

    return process.exit(0);
});
