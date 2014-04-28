var TypeAError = require('../../util/internal/errors/TypeAError');
var TypeBError = require('../../util/internal/errors/TypeBError');

module.exports = {
    'description': 'description',
    'invoke': function(session, args, callback) {
        throw new TypeAError('isaregexpmatch');
    }
};
