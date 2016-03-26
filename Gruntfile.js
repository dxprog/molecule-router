module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      options: {
        transform: [
          [ 'babelify', { presets: 'es2015' } ]
        ]
      },
      dist: {
        files: {
          './tests/tests.js': [ './tests/index.js' ]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('default', [ 'browserify' ]);

};