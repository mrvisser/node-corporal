var TypeAError = require('../../util/internal/errors/TypeAError');
var TypeBError = require('../../util/internal/errors/TypeBError');

module.exports = {
    'description': 'description',
    'invoke': function(session, args, callback) {
        var err = new Error();
        err.code = 'isastringmatch';
        throw err;
    }
};
