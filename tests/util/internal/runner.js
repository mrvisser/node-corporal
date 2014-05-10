
var _ = require('underscore');
var argv = require('optimist').argv;
var assert = require('assert');
var util = require('util');

var Corporal = require('../../../index');
var TypeAError = require('./errors/TypeAError');
var TypeBError = require('./errors/TypeBError');

var commandContexts = null;
if (argv.contexts) {
    commandContexts = {};
    _.each(argv.contexts, function(commandNames, contextName) {
        commandContexts[contextName] = {'commands': commandNames.split(',')};
    });
}

var corporal = new Corporal({
    'commands': argv.commands,
    'commandContexts': commandContexts,
    'disabled': _.isString(argv.disabled) ? argv.disabled.split(',') : null,
    'env': JSON.parse(argv.env)
});

/*!
 * Verify string precedence over all the things
 */

corporal.onCommandError(TypeAError, 'isastringmatch', function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: isastringmatch');
    return next();
});

corporal.onCommandError(TypeAError, /^isastringmatch/, function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: isaregexpmatch');
    return next();
});

corporal.onCommandError(TypeAError, function(code) { return (code === 'isastringmatch'); }, function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: isafunctionmatch');
    return next();
});


/*!
 * Verify regexp precedence over functions
 */

corporal.onCommandError(TypeAError, /^isaregexpmatch/, function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: isaregexpmatch');
    return next();
});

corporal.onCommandError(TypeAError, function(code) { return (code === 'isaregexpmatch'); }, function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: isafunctionmatch');
    return next();
});


/*!
 * Verify function will match
 */

corporal.onCommandError(TypeAError, function(code) { return (code === 'isafunctionmatch'); }, function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: isafunctionmatch');
    return next();
});


/*!
 * Verify null code matches
 */

corporal.onCommandError(TypeAError, function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: isanullmatch 0');
    return next();
});

corporal.onCommandError(TypeAError, function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: isanullmatch 1');
    return next();
});


/*!
 * Verify string precedence
 */

corporal.onCommandError(TypeAError, 'teststringprecedence', function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: teststringprecedence 0');
    return next();
});

corporal.onCommandError(TypeAError, 'teststringprecedence', function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: teststringprecedence 1');
    return next();
});


/*!
 * Verify regexp precedence
 */

corporal.onCommandError(TypeAError, 'testregexpprecedence', function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: testregexpprecedence 0');
    return next();
});

corporal.onCommandError(TypeAError, 'testregexpprecedence', function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: testregexpprecedence 1');
    return next();
});


/*!
 * Verify function precedence
 */

corporal.onCommandError(TypeAError, 'testfunctionprecedence', function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: testfunctionprecedence 0');
    return next();
});

corporal.onCommandError(TypeAError, 'testfunctionprecedence', function(err, session, next) {
    assert.ok(session);
    console.log('TypeAError: testfunctionprecedence 1');
    return next();
});


/*!
 * Verify it can resolve TypeBError if it wants to
 */

corporal.onCommandError(TypeBError, 'isastringmatch', function(err, session, next) {
    assert.ok(session);
    console.log('TypeBError: isastringmatch');
    return next();
});


/*!
 * Verify type precedence
 */

corporal.onCommandError(Error, 'isastringmatch', function(err, session, next) {
    assert.ok(session);
    console.log('Error: isastringmatch');
    return next();
});


/*!
 * Verify a catch-all for all "Error" types that don't match anything else
 */

corporal.onCommandError(Error, function(err, session, next) {
    assert.ok(session);
    console.log('Error: catchall');
    return next();
});

corporal.start(function(err) {
    if (err) {
        return process.exit(1);
    }

    return process.exit(0);
});
