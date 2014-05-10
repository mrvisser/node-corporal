module.exports = {
    'description': 'switch-context',
    'invoke': function(session, args, callback) {
        session.commands().ctx(args[0]);
        return callback();
    }
};
