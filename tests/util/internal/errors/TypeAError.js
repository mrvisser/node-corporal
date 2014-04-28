var util = require('util');

var TypeAError = module.exports = function(code, message) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;

    this.code = code;
    this.message = message;
};
util.inherits(TypeAError, Error);
