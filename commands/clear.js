module.exports = {
    'description': 'Clear the terminal window.',
    'invoke': function(session, args, callback) {
        process.stdout.write('\u001B[2J\u001B[0;0f');
        return callback();
    }
};