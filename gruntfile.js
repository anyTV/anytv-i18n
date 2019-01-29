'use strict';


module.exports = (grunt) => {

    grunt.initConfig({
        eslint: {
            src: [
                'gruntfile.js',
                'src/**/*.js'
            ],
            options: {
                configFile: '.eslintrc',
            }
        },

        rollup: {
            options: {
                format: 'cjs'
            },
            files: {
                src: 'src/index.js',
                dest: 'index.js'
            }
        },

        mochaTest: {
            test: {
                src: ['test/**/*.js'],
                options: {
                    reporter: 'spec',
                    timeout: 5000,
                    clearRequireCache: true,
                    require: 'babel-register'
                },
            },
        },

        watch: {
          rollup: {
            files: ['<%= eslint.src %>'],
            tasks: ['eslint', 'rollup'],
            options: {
                spawn: false
            }
          }
        }
    });

    grunt.loadNpmTasks('gruntify-eslint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-rollup');

    grunt.registerTask('test', ['eslint', 'mochaTest']);
    grunt.registerTask('test-watch', ['eslint', 'watch']);
    grunt.registerTask('build', ['rollup']);
    grunt.registerTask('default', ['eslint', 'rollup', 'watch']);

};
