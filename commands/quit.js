var _ = require('underscore');
var sprintf = require('sprintf-js').sprintf;

module.exports = {
    'description': 'Quit the interactive shell.',
    'invoke': function(session, args, callback) {
        session.quit();
        return callback();
    }
};
