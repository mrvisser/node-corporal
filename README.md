## Corporal

[![Build Status](https://travis-ci.org/mrvisser/node-corporal.png?branch=master)](https://travis-ci.org/mrvisser/node-corporal)

An extensible interactive shell utility. Corporal can be used as an API in order to create a customized interactive shell experience
for your CLI utility.

## Features

Currently:

* Multi-line command support
* Customizable PS1 / PS2 prompts
* Mutable environment for stateful shell sessions
* Help / command list index

Future:

* Automated auto-complete functionality

## Examples

Create an interactive shell with just a `help` and `quit` command:

**Code:**
```javascript
var Corporal = require('corporal');
new Corporal().start();
```

**Session:**
```
> help
List of available commands:

help:  Show a dialog of all available commands.
quit:  Quit the interactive shell.

> blah
Invalid command: blah

List of available commands:

help:  Show a dialog of all available commands.
quit:  Quit the interactive shell.

> help help

Show a dialog of all available commands.

Usage: help [<command>]

> help quit

Quit the interactive shell.

> quit
```

## License

Copyright (c) 2014 Branden Visser

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
