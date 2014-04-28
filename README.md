## Corporal

[![Build Status](https://travis-ci.org/mrvisser/node-corporal.png?branch=master)](https://travis-ci.org/mrvisser/node-corporal)

An extensible interactive shell utility. Corporal can be used as an API in order to create a customized interactive shell experience
for your CLI utility.

## Features

Currently:

* Tab auto-complete for commands based on available commands
* Multi-line commands
* Custom PS1 and PS2 prompts
* API and Model for creating and loading your own commands
* Environment support for stateful CLI sessions
* Up / down functionality for command history
* `clear` command to clear the terminal window
* Flexible error handling

Planned:

* Ability for commands to extend auto-complete functionality for more than just command-name completion

## Examples

### Whoami

See `examples/whoami` for this tutorial.

**Sample Setup:**

```javascript
var Corporal = require('corporal');
var corporal = new Corporal({

    // Commands will be loaded from JS files in the "commands" directory. Each command
    // exports an object that contains data and functions for describing and invoking
    // the command
    'commands': __dirname + '/commands'

    // Define an initial environment
    //  * The arbitrary "me" environment variable defines who the "current user" is
    //  * The ps1 variable pulls the current value of the "me" variable to put in the PS1 prompt
    //  * The the "colors" module is used to provide "bold" styling on the PS1
    //  * The ps2 variable is used as the prompt prefix in multi-line commands. "> " is also
    //    the default value
    'env': {
        'me': 'unknown'
        'ps1' '%(me)s$ '.bold,
        'ps2': '> '
    }
});

// Start the interactive prompt
corporal.start();
```

**Sample Command:**

`commands/iam.js` command is used to set in the environment the current user. The name of the JS file will indicate what the name of the command should be:

```javascript
var optimist = require('optimist');

module.exports = {

    // Required: Defines a description for the command that can be seen in command listings
    // and help dialogs
    'description': 'Tell the session who you are.',

    // Optional: Additional text to show how the command can be used. Can be multi-line, etc...
    'help': 'Usage: iam <name>',

    // The function that actually invokes the command. Optimist is being used here to parse
    // the array arguments that were provided to your command, however you can use whatever
    // utility you want
    'invoke': function(session, args, callback) {

        // Parse the arguments using optimist
        var argv = optimist.parse(args);

        // Update the environment to indicate who the specified user now is
        session.env('me', argv._[0] || 'unknown');

        // The callback always needs to be invoked to finish the command
        return callback();
    }
};
```

**Sample Usage:**

```
~/Source/node-corporal$ node examples/whoami/run.js
unknown$ help
List of available commands:

help :  Show a dialog of all available commands.
quit :  Quit the interactive shell.
greet:  Give a greeting to the current user.
iam  :  Tell the session who you are.

unknown$ greet
Hello, unknown
unknown$ iam branden
branden$ greet
Hello, branden
branden$ iam \
> \
> steve
steve$ help iam

Tell the session who you are.

Usage: iam <name>

steve$ quit
```


## License

Copyright (c) 2014 Branden Visser

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
