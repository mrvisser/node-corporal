module.exports = function(grunt) {
    var mocha_grep = process.env.MOCHA_GREP || undefined;

    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-release');

    grunt.initConfig({
        'mochaTest': {
            'test': {
                'src': ['tests/setup.js', 'tests/*.js'],
                'options': {
                    'grep': mocha_grep,
                    'ignoreLeaks': true,
                    'reporter': 'spec'
                }
            }
        },
        'release': {
            'options': {
                'github': {
                    'repo': 'mrvisser/node-corporal',
                    'usernameVar': 'GITHUB_USERNAME',
                    'passwordVar': 'GITHUB_PASSWORD'
                }
            }
        }
    });

    grunt.registerTask('default', 'mochaTest');
};
