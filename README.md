## Corporal

[![Build Status](https://travis-ci.org/mrvisser/node-corporal.png?branch=master)](https://travis-ci.org/mrvisser/node-corporal)

An extensible interactive shell utility. Corporal can be used as an API in order to create a customized interactive shell experience
for your CLI utility.

## Features

Currently:

* Parsing of string command input into an argv array
* Multi-line commands
* Tab auto-complete for commands based on available commands
* API and Model for creating and loading your own commands
* Flexible error handling
* Custom PS1 and PS2 prompts
* Environment support for stateful CLI sessions
* Up / down functionality for command history
* `clear` command to clear the terminal window
* Make commands only available in certain contexts

Planned:

* Ability for commands to extend auto-complete functionality for more than just command-name completion

## Usage

Corporal is initialized with a constructor, which takes in an options object. Once ready to start the interactive prompt, you can invoke the `start()` function for the Corporal object:

```javascript
var Corporal = require('corporal');
new Corporal({'commands': __dirname + '/commands'}).start();
```

### Options

* `commands:` A **String** that points to a directory full of JavaScript files that export commands, or an **Object** keyed by command name whose values are the command objects
* `env`: An **Object** defining the initial environment for the interactive shell session. Commands have access to the environment throughout the session and can change state on the fly
* `disabled`: An Array of Strings that define which commands should not be loaded into the interactive prompt
* `commandContexts`: An object defining contexts that define filtered sets of commands that are available in certain contexts. See examples for how to use this

### Commands

A Command implementation is an object that contains at least 2 fields:

* `description` (required). A **String** that briefly defines in one sentence what the command does. This is shown in the `help` command
* `invoke` (required). A `function(session, args, callback)` that is invoked when the command is run. The `session` is the current Session object and the `args` is an array of strings representing the argv with which the command was invoked
* `help` (optional). A **String** that gives a more verbose usage of how to use the command. This content is shown when `help <command name>` is used
* `init` (optional). A `function(session, callback)` that is invoked only once when the shell session has begun. It is invoked before the user is presented a prompt and as a result before any command is executed. Useful for preparing the environment with default values, if necessary

The internal commands `clear`, `help` and `quit` provide good examples for implementing commands.

### Session API

The Session object is used to manipulate session information, particularly environment variables and the current command context. The Session object is provided for each command as well as handling error scenarios.

Common operations:

* Get the value of an environment variable

    `session.env('myvariable')`

* Set the value of an environment variable

    `session.env('myvariable', 'myvalue')`

* Quit the shell session. When invoked, this signals the command loop to exit the session rather than prompt for the next command

    `session.quit()`

* Get the current command context

    `session.commands().ctx()`

* Change the current command context, making a different set of commands available

    `session.commands().ctx('newcontext')`

* Get the Standard Output stream (when running in different modes, it may not always be `process.stdout`)

    `session.stdout()`

* Get the Standard Error stream (when running in different modes, it may not always be `process.stderr`)

    `session.stderr()`

## Examples

### Simple prompt

Creating a prompt loop with only the core commands (`clear`, `help` and `quit`) is really easy and useless:

```javascript
var Corporal = require('corporal');
new Corporal().start();
```

### Implement a simple command

Commands are JavaScript objects that contain at least a `description` and an `invoke` function.

```javascript
var Corporal = require('corporal');
new Corporal({
    'commands': {
        'say': {
            'description': 'Say something.',
            'invoke': function(session, args, callback) {
                session.stdout().write(args[0] + '\n');
                callback();
            }
        }
    }
}).start();
```

```
$ node test.js
> help
List of available commands:

clear:  Clear the terminal window.
help :  Show a dialog of all available commands.
quit :  Quit the interactive shell.

> quit
$
```

### Load commands from a directory of JavaScript files

Rather than declare all commands in a single file, load a directory full of JavaScript files that export a `Command` object.

```javascript
var Corporal = require('corporal');
new Corporal({'commands': __dirname + '/commands'}).start();
```

### Error handling

Handle errors that are thrown or returned from the `invoke` function.

```javascript
var colors = require('colors');
var Corporal = require('corporal');
var ValidationError = require('./errors/validation');

// Launch a shell with a custom command that just prints what you tell to say. This
// time, the first argument is required
var corporal = new Corporal({
    'commands': {
        'say': {
            'description': 'Say something.',
            'invoke': function(session, args, callback) {
                if (!args[0]) {
                    throw new ValidationError('You must say something, anything!');
                }

                session.stdout().write(args[0] + '\n');
                callback();
            }
        }
    }
});

// Handle any validation error that gets thrown from a command
corporal.onCommandError(ValidationError, function(err, session, next) {
    session.stderr().write(err.message.red + '\n');
    next();
});

// Handle any other type of error that gets thrown from a command
corporal.onCommandError(Error, function(err, session, next) {
    session.stderr().write('An unexpected error occurred, quitting.'.red + '\n');
    session.stderr().write(err.stack.red + '\n');

    session.quit();
    next();
});

// Finally start the command loop
corporal.start();
```

### Custom PS1 and PS2

Provide custom PS1 and PS2 command prompts that can be templated with `sprintf-js` using a global environment that is available throughout the shell session. This example demonstrates use of an environment variable to drive the content of the PS1 prompt.

```javascript
var Corporal = require('corporal');
new Corporal({

    // Define our command
    'commands': {
        'iam': {
            'description': 'Tell the system who you are.',
            'invoke': function(session, args, callback) {
                // Use the session.env function to get and set environment variables
                session.env('me', args[0]);
                callback();
            }
        }
    },

    // Define an initial environment
    //  * The arbitrary "me" environment variable defines who the "current user" is
    //  * The ps1 variable pulls the current value of the "me" variable to put in the PS1 prompt
    //  * The the "colors" module is used to provide "bold" styling on the PS1
    //  * The ps2 variable is used as the prompt prefix in multi-line commands. "> " is also
    //    the default value
    'env': {
        'me': 'unknown',
        'ps1': '%(me)s$ '.bold,
        'ps2': '> '
    }
}).start();
```

```
$ node test.js
unknown$ help
List of available commands:

clear:  Clear the terminal window.
help :  Show a dialog of all available commands.
quit :  Quit the interactive shell.
iam  :  Tell the system who you are.

unknown$ iam branden
branden$ quit
```

### Command Contexts

It is possible to filter the commands available based on a custom context. For example, if your shell application requires authentication, you may want to provide some commands only to users when they are authenticated. Contexts allow you to accomplish this.

```javascript
var Corporal = require('corporal');
new Corporal({

    // Define our command
    'commands': {
        'iam': {
            'description': 'Tell the system who you are.',
            'invoke': function(session, args, callback) {
                // Use the session.env function to get and set environment variables
                session.env('me', args[0] || 'unknown');

                if (args[0]) {
                    // Indicate we have indicated who we are
                    session.commands().ctx('auth');
                } else {
                    // Indicate we currently don't know who the user is
                    session.commands().ctx('anon');
                }

                callback();
            }
        },
        'say': {
            'description': 'Say something as somebody.',
            'invoke': function(session, args, callback) {
                // Say something as the current user
                session.stdout().write(util.format('%s: %s\n', session.env('me'), args[0]));
                callback();
            }
        }
    },

    // Define an initial environment
    //  * The arbitrary "me" environment variable defines who the "current user" is
    //  * The ps1 variable pulls the current value of the "me" variable to put in the PS1 prompt
    //  * The the "colors" module is used to provide "bold" styling on the PS1
    //  * The ps2 variable is used as the prompt prefix in multi-line commands. "> " is also
    //    the default value
    'env': {
        'me': 'unknown',
        'ps1': '%(me)s$ '.bold,
        'ps2': '> '
    },

    // Define the "auth" context for commands that are only available to "authorized" users
    //  * "auth" is the only context that gives access to "say" something
    //  * the "iam" command is always available
    //
    // The command implementations are subsequently responsible for performing the context
    // switches when appropriate
    'commandContexts': {
        '*': {
            'commands': ['iam']
        },
        'auth': {
            'commands': ['say']
        }
    }
}).start();
```

```
$ node test.js
unknown$ help
List of available commands:

iam  :  Tell the system who you are.
clear:  Clear the terminal window.
help :  Show a dialog of all available commands.
quit :  Quit the interactive shell.

unknown$ iam branden
branden$ help
List of available commands:

say  :  Say something as somebody.
iam  :  Tell the system who you are.
clear:  Clear the terminal window.
help :  Show a dialog of all available commands.
quit :  Quit the interactive shell.

branden$ say hello
branden: hello
branden$ iam
unknown$ help
List of available commands:

iam  :  Tell the system who you are.
clear:  Clear the terminal window.
help :  Show a dialog of all available commands.
quit :  Quit the interactive shell.

unknown$ quit
```

## License

Copyright (c) 2014 Branden Visser

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
