var util = require('util');

var TypeBError = module.exports = function(code, message) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;

    this.code = code;
    this.message = message;
};
util.inherits(TypeBError, Error);
