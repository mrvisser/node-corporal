var colors = require('colors');
var path = require('path');
var fs = require('fs')

var HISTORY_FILE = '.corporal-history'

var Corporal = require('../../index');
var corporal = new Corporal({

    // Commands will be loaded from JS files in the "commands" directory. Each command
    // exports an object that contains data and functions for describing and invoking
    // the command
    'commands': path.join(__dirname, 'commands'),

    // Define an initial environment:
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
});

function setupHistory(defaultHistory) {
    var history;

    // Try to read the existing history file
    try {
      var elements = fs.readFileSync(HISTORY_FILE,{encoding:'utf8'});
      history = elements.split('\n');

      // remove last element (unless it is not empty)
      var lastElement = history.pop();
      if (lastElement !== "") {
        history.push(lastElement);
      }
    } catch (e) {
      // Use default value

      // Check, if the defaultHistory argument can be used
      if (Array.isArray(defaultHistory)) {
        history = defaultHistory
      } else {
        // default to empty list
        history = [];
      }
    }

    // Override the push method of the history object to save changes
    //   (push normally supports several arguments, but since readline only
    //   pushes one element at a time into history, we can savely ignore this)
    var lastElement = null; // To filter direct command repetitions out
    history.push = function(newElement) {
      if (newElement == lastElement) {
        return; // Don't push command repetiton
      }
      lastElement = newElement; // remember for next push.

      // save the new history element (ignore errors)
      fs.appendFile(HISTORY_FILE,newElement + '\n',{encoding:'utf8'});

      // and call the original push method
      return Array.prototype.push.apply(this,arguments);
    }

    return history;
}

var history = setupHistory(['iam branden', 'greet']);

// Start the interactive prompt (as in run.js)
corporal.on('load', function() {
    corporal.loop({'history': history});
});
