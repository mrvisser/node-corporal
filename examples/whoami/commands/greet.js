module.exports = {

    // Required: Defines a description for the command that can be seen in command listings
    // and help dialogs
    'description': 'Give a greeting to the current user.',

    // The function that actually invokes the command. Simply pull the current state of the
    // "me" environment variable and print it to the console.
    'invoke': function(session, args, callback) {
        console.log('Hello, ' + session.env('me').bold);
        return callback();
    }
};
