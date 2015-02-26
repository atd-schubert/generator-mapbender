/*jslint node: true */
'use strict';

/**
 * This is the basic Gruntfile for Wheregroup PHP projects.
 *
 * @module ./Gruntfile.js
 * @author Arne Schubert <atd.schubert@gmail.com>
 */

/**
 * Common.JS object
 * @name module
 * @type {object}
 * @property {*} exports - Reference to export module data
 */

/**
 * Function to require Common.JS modules
 * @name require
 * @type {function}
 */

/**
 * Grunt module
 * @name grunt
 * @link http://gruntjs.com/api/grunt - Grunt API Documentation
 * @requires grunt
 * @property {function} initConfig
 * @property {function} loadNpmTasks
 * @property {function} registerMultiTask
 * @property {function} registerTask
 * @property {object} config
 * @property {object} task
 * @property {function} task.run
 * @property {object} log
 * @property {object} file
 * @property {object} fail
 * @property {function} fail.fatal
 * @type {object}
 */

/**
 * Node library to handle paths
 * @requires path
 * @typedef {string} path - A local path
 * @type {exports}
 */
var path = require('path');

/**
 * Node library to handle urls
 * @requires url
 * @typedef {string} url - URL Format
 * @type {exports}
 */
var url = require('url');

/**
 * Node library to handle get and post requests on http
 * @requires request
 * @type {request|exports}
 */
var request = require('request');

/**
 * Node library for spawning child-processes
 * @name spawn
 * @type {function}
 */
var spawn = require('child_process').spawn;

/**
 * Node library for operations on filesytem
 * @requires fs
 * @type {exports}
 */
var fs = require('fs');

/**
 * Task-runner for wheregroup php projects
 * @param {grunt} grunt
 */
module.exports = function wheregroupTaskRunner(grunt) {
// Configurations
  /**
   * Object to define project settings
   * @type {object}
   * @name project
   * @property {string} name - Name of the project
   * @property {path} base - Path of the project base folder (defaults cwd)
   * @property {object} dev - Settings for the development environment
   * @property {string} dev.hostname - Name of the server (defaults localhost)
   * @property {number} dev.port - Number of the port for the development environment (defaults 3000)
   * @property {url} dev.browserUrl - URL to open in browser (defaults to http://{hostname}:{port}/app_dev.php)
   * @property {path} code - Path to code folder
   * @property {path} htdocs - Path to htdocs (defaults to code-folder->web)
   * @property {path} source - Path to symfony source (defaults to code-folder->src)
   * @property {path} vendor - Path to vendor files (defaults to code-folder->vendor)
   * @property {path} vendorBin - Path to vendor binary files (defaults to code-folder->bin)
   * @property {path} dist - Path to distribution folder to save bundled versions
   * @property {path} doc - Path to documentation folder
   * @property {object} console - Object to save CLIs
   * @property {path} console.symfony - Path to symfony-console
   * @property {path} console.composer - Path to composer-console
   *
   */
  var project = {
    name: 'Wheregroup-Grunt-Test',
    base: path.resolve(), // local path
    dev: {
      hostname: 'localhost',
      port: 3000
    }
  };
  project.code = path.resolve(project.base, 'application');
  project.htdocs = path.resolve(project.code, 'web');
  project.source = path.resolve(project.code, 'src');
  project.vendor = path.resolve(project.code, 'vendor');
  project.vendorBin = path.resolve(project.code, 'bin');
  project.dist = path.resolve(project.base, 'dist');
  project.doc = path.resolve(project.base, 'doc');
  project.jsDoc = path.resolve(project.doc, 'js');
  project.phpDoc = path.resolve(project.doc, 'php');
  project.symfony = path.resolve(project.code, 'app');
  project.cache = path.resolve(project.symfony, 'cache');
  project.logs = path.resolve(project.symfony, 'logs');
  project.console = {
    symfony: path.resolve(project.symfony, 'console'),
    composer: path.resolve(project.base, 'composer')
  };
  project.dev.browserUrl = url.format({
    protocol: 'http',
    slashes: true,
    hostname: project.dev.hostname,
    port: project.dev.port,
    pathname: 'app_dev.php'
  });

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    project: project,

// General
    watch: {
      markup: {
        files: ['index.php'],
        options: {
          livereload: true
        }
      }
    },
    fileExists: {
      readme: [path.resolve(project.base, 'README.md')],
      grunt: [path.resolve(project.base, 'package.json'), path.resolve(project.base, 'Gruntfile.js')],
      composer: [path.resolve(project.code, 'composer.json')]
    },
    open: {
      default: {
        path: project.dev.browserUrl
      }
    },
    clean: {
      dist: [project.dist + '/*'],
      doc: [project.doc + '/*'],
      composer: [project.vendor, project.vendorBin, project.console.composer, project.code + '/composer.lock'],
      cache: [project.cache + '/*'],
      log: [project.logs + '/*']
    },
    compress: {
      zip: {
        options: {
          mode: 'zip',
          archive: project.dist + '/' + project.name + '.zip'
        },
        src: [project.code + '/**', project.doc + '/**'],
        cwd: project.code
      },
      tgz: {
        options: {
          mode: 'tgz',
          archive: project.dist + '/' + project.name + '.tar.gz'
        },
        src: [project.code + '/**', project.doc + '/**'],
        cwd: project.code
      },
      tar: {
        options: {
          mode: 'tar',
          archive: project.dist + '/' + project.name + '.tar'
        },
        files: [
          {expand: true, cwd: path.relative(project.base, project.base + '/..'), src: path.relative(project.base + '/..', project.code) + '/**'},
          {expand: true, cwd: path.relative(project.base, project.base + '/..'), src: path.relative(project.base + '/..', project.doc) + '/**'},
          {expand: true, cwd: path.relative(project.base, project.base + '/..'), src: path.relative(project.base + '/..', project.base) + '/*.*'}
        ]
      }
    },
    package: {
      tar: {
        task: 'compress',
        subtask: 'tar',
        type: 'tarball'
      },
      zip: {
        task: 'compress',
        subtask: 'zip',
        type: 'zip archive'
      },
      tgz: {
        task: 'compress',
        subtask: 'zip',
        type: 'zipped tarball'
      }
    },
// PHP
    php: {
      dev: {
        options: {
          hostname: project.dev.hostname,
          port: project.dev.port,
          base: project.htdocs
        }
      }
    },
    phpcs: {
      application: {
        dir: [project.source]
      },
      options: {
        bin: path.resolve(project.vendorBin, 'phpcs'),
        standard: 'PSR2'
      }
    },
    phpmd: {
      application: {
        dir: project.source
      },
      options: {
        bin: path.resolve(project.vendorBin, 'phpmd'),
        rulesets: 'codesize,unusedcode,naming',
        strict: true
        //ignoreWarningCode: false // Default is true!
      }
    },
    phpunit: {
      unit: {
        dir: 'tests/php/'
      },
      functional: {
        dir: 'tests/php/'
      },
      options: {
        bin: path.resolve(project.vendorBin, 'phpunit'),
        bootstrap: path.resolve(project.code, 'tests/php/phpunit.php'),
        colors: true
      }
    },
    composer: {
      options: {
        composerLocation: project.console.composer,
        cwd: project.code,
        usePhp: false
      },
      update: {},
      install: {},
      selfupdate: {}
    },
    symfony: {
      options: {
        cliLocation: project.console.symfony,
        cwd: project.code
      },
      //'doctrine-schema-drop': {},
      //'doctrine-database-drop': {},
      'doctrine-database-create': {},
      'doctrine-schema-create': {},
      'assets-install': {}
    },
// JavaScript
    jshint: {
      options: {
        "curly": true,
        "eqnull": true,
        "eqeqeq": true,
        "undef": true,
        "globals": {
          "jQuery": true
        }
      },
      mapbender: {
        files: {
          src: ['**/mapbender.*.js']
        }
      }
    },
    jsdoc2md: {
      mapbender: {
        src: '**/mapbender.*.js',
        dest: path.relative(project.base, project.jsDoc) + '/api/documentation.md'
      }/*,
       separateOutputFilePerInput: {
       files: [
       { src: "src/jacket.js", dest: "api/jacket.md" },
       { src: "src/shirt.js", dest: "api/shirt.md" }
       ]
       },
       withOptions: {
       options: {
       index: true
       },
       src: "src/wardrobe.js",
       dest: "api/with-index.md"
       }*/
    }
  });


// Loaded-tasks:
// General
  /**
   * Task for watching changes during development
   * @link https://github.com/gruntjs/grunt-contrib-watch - Github
   * @requires grunt-contrib-watch/tasks/watch.js
   */
  grunt.loadNpmTasks('grunt-contrib-watch');

  /**
   * Task to proof that files exists. For example README.md, package.json etc.
   * @link https://github.com/alexeiskachykhin/grunt-file-exists - Github
   * @requires grunt-file-exists/tasks/fileExists.js
   */
  grunt.loadNpmTasks('grunt-file-exists');

  /**
   * Task to open and reload automatically the project in a browser
   * @link https://github.com/jsoverson/grunt-open - Github
   * @requires grunt-open/tasks/open.js
   */
  grunt.loadNpmTasks('grunt-open');

  /**
   * Task to remove files and make a project clean
   * @requires grunt-contrib-clean/tasks/clean.js
   */
  grunt.loadNpmTasks('grunt-contrib-clean');

  /**
   * Task to compress project into a bundle
   * @requires grunt-contrib-compress/tasks/compress.js
   */
  grunt.loadNpmTasks('grunt-contrib-compress');


// PHP
  /**
   * Task for starting php in development mode on port 3000
   * @link https://github.com/sindresorhus/grunt-php - Github
   * @requires grunt-php/tasks/php.js
   */
  grunt.loadNpmTasks('grunt-php');

  /**
   * Grunt plugin for running PHP Code Sniffer
   * @link https://github.com/SaschaGalley/grunt-phpcs - Github
   * @requires grunt-phpcs/tasks/phpcs.js
   */
  grunt.loadNpmTasks('grunt-phpcs');

  /**
   * Grunt plugin for running PHP Mess Detector
   * @link https://github.com/alappe/grunt-phpmd - Github
   * @requires grunt-phpmd/tasks/phpmd.js
   */
  grunt.loadNpmTasks('grunt-phpmd');

  /**
   * Grunt plugin for running unit-tests
   * @link https://github.com/SaschaGalley/grunt-phpunit - Github
   * @requires grunt-phpunit/tasks/phpunit.js
   */
  grunt.loadNpmTasks('grunt-phpunit');

  /**
   * Grunt plugin to work with composer-cli
   */
  grunt.registerMultiTask("composer", "Handles operation on composer-cli", function composerTask() {
    var done = this.async(),
      opts = this.options(),
      spawnOpts = {},
      cmd;
    opts.flags = opts.flags || [];
    opts.flags.unshift(this.target);
    opts.composerLocation = opts.composerLocation || "composer";

    if (opts.cwd) {
      spawnOpts.cwd = opts.cwd || project.code;
    }

    if (opts.usePhp) {
      opts.flags.unshift(opts.composerLocation);
      grunt.log.writeln('Running "php ' + opts.flags.join(" ") + '"');
      cmd = spawn("php", opts.flags, spawnOpts);

    } else {
      grunt.log.writeln('Running "composer ' + opts.flags.join(" ") + '"');
      cmd = spawn(opts.composerLocation, opts.flags, spawnOpts);
    }
    cmd.on("close", function () {
      grunt.log.writeln('composer done');
      done();
    });
    /*cmd.stderr.on("data", function (data) {
      //grunt.fail.warn('Error with composer!');
      grunt.fail.fatal(data.toString());
    });*/
    cmd.stdout.on("data", function (data) {
      data = data.toString();
      if (data.indexOf('http://getcomposer.org/doc/articles/troubleshooting.md') >= 0) {
        grunt.fail.warn(data);
      }
    });
  });

  /**
   * Grunt plugin to work with symfony-cli
   */
  grunt.registerMultiTask("symfony", "Handles operation on symfony-cli", function composerTask() {
    var done = this.async(),
      opts = this.options(),
      spawnOpts = {},
      cmd;
    opts.flags = opts.flags || [];
    opts.flags.unshift(this.target.split('-').join(':'));
    if (this.target === 'assets-install') {
      if (/^win/.test(process.platform)) {
        opts.flags.push('--symlink');
      }
      opts.flags.push('web');
    }
    opts.cliLocation = opts.cliLocation || project.code + '/app/console';

    if (opts.cwd) {
      spawnOpts.cwd = opts.cwd || project.code;
    }
    grunt.log.writeln('Running "symfony console ' + opts.flags.join(" ") + '"');
    cmd = spawn(opts.cliLocation, opts.flags, spawnOpts);

    cmd.on("close", function () {
      grunt.log.writeln('symfony console done');
      done();
    });
    cmd.stderr.on("data", function (data) {
      //grunt.fail.warn('Error with composer!');
      grunt.fail.fatal(data.toString());
    });
    cmd.stdout.on("data", function (data) {
      data = data.toString();
    });
  });

  /**
   * Grunt plugin for installing composer
   * @requires grunt-composer/tasks/composer.js
   */
  grunt.registerTask('install-composer', 'Install composer-cli', function installComposerTask() {
    var composerUrl = 'https://getcomposer.org/installer',
      done = this.async(),
      cmd;
    if (!grunt.file.exists(project.console.composer)) {
      grunt.log.writeln('You have no version of composer installed. Grunt will try to do this for you...');
      cmd = spawn('php');
      request.get(composerUrl).pipe(cmd.stdin);
      cmd.on('close', function () {
        grunt.log.writeln('Now you have got the latest version of composer fetched.');
        fs.rename(path.resolve(project.base, 'composer.phar'), project.console.composer, function (err) {
          if (err) {
            return grunt.fail.fatal('Could not move the the fetched composer ');
          }
          grunt.log.writeln('Now you have got the latest version of composer installed.');
          done();
        });
      });
    } else {
      grunt.log.writeln('You have composer already installed.');
      done();
    }
    /* else {
     grunt.log.writeln('You have composer already installed. Grunt will try to update it for you...');
     cmd = spawn(project.console.composer, ['self-update']);
     cmd.on('close', function(){
     grunt.log.writeln('Now you have got composer updated to the latest version.');
     done();
     });
     }*/
  });

// JavaScript

  /**
   * JavaScript Hint library
   * @link https://github.com/gruntjs/grunt-contrib-jshint - Github
   * @requires grunt-contrib-jshint/tasks/jshint.js
   */
  grunt.loadNpmTasks('grunt-contrib-jshint');
//// Group-Tasks
  /**
   * Task to create a package
   */
  grunt.registerMultiTask('package', 'Bundle this project into a package.', function () {
    var taskName = this.data.task;
    if (grunt.config.get(taskName)[this.target]) {
      grunt.log.writeln('Packaging as ' + this.target);
      grunt.task.run(taskName + ':' + this.target);
    } else {
      grunt.log.writeln('Packaging as ' + this.target + 'is not configured in subtask!');
    }
  });

  /**
   * Group of tasks for validating php resources
   */
  grunt.registerTask('validate-php', 'Validate php resources with settings defined in composer.json.', function () {
    if (grunt.file.exists(grunt.config.get("phpmd").options.bin)) {
      grunt.log.writeln('PHP-MD is configured');
      grunt.task.run("phpmd");
    } else {
      grunt.log.writeln('PHP-MD is not configured and will be skipped...');
    }
    if (grunt.file.exists(grunt.config.get("phpcs").options.bin)) {
      grunt.log.writeln('PHP-CS is configured');
      grunt.task.run("phpcs");
    } else {
      grunt.log.writeln('PHP-CS is not configured and will be skipped...');
    }

    if (grunt.file.exists(grunt.config.get("phpunit").options.bin) &&
      grunt.file.exists(grunt.config.get("phpunit").options.bootstrap)) {
      grunt.log.writeln('phpunit is configured');
      grunt.task.run("phpunit");
    } else {
      grunt.log.writeln('phpunit is not configured and will be skipped...');
    }

  });

  /**
   * Group of tasks for validating JavaScript resources
   */
  grunt.registerTask('validate-js', 'Validate js resources.', [
    'jshint'
  ]);

  /**
   * Group of tasks that will be executed on tagging in git-repo with gitlab-ci
   * or if you want to create your own package call 'grunt package'
   */
  grunt.registerTask('validate', 'Validate whole project.', [
    'fileExists',
    'validate-php',
    'validate-js'
  ]);

  /**
   * Group of tasks that will be executed on initializing project (after git clone)
   * or if you want to reinitialize.
   */
  grunt.registerTask('init', 'Initialize project, resolve dependencies.', [
    'install-composer',
    'composer:install',
    'symfony'
  ]);

  /**
   * Group of tasks that can be executed to update dependencies
   */
  grunt.registerTask('update', 'Update dependencies.', [
    'composer:selfupdate',
    'composer:update'
  ]);

  /**
   * Group of tasks that have to execute to deploy a project
   */
  grunt.registerTask('deploy', 'Deploy project.', function () {
    grunt.log.writeln('This task-group should deploy the current project, but is not working at the moment.');
  });

  /**
   * Group of tasks that can be executed to run the project in a local test enviroment
   */
  grunt.registerTask('run', 'Run test environment.', [
    'php:dev',
    'open',
    'watch'
  ]);

  /**
   * Group of tasks that can be executed to run the project in a local test enviroment
   */
  grunt.registerTask('doc', 'Create documentation for this project.', function () {
    grunt.log.writeln('This task-group should create a doc for the current project.');
  });

  /**
   * Task for commits on gitlab-ci
   */
  grunt.registerTask('gitlab-ci-commit', ['init', 'validate-js', 'phpmd', 'phpcs', 'php-unit:unit']);

  /**
   * Task for tags on gitlab-ci
   */
  grunt.registerTask('gitlab-ci-tag', ['init', 'validate', 'doc', 'package', 'deploy']);

  /**
   * Default Task will be run on calling grunt without any arguments
   */
  grunt.registerTask('default', ['run']);
};
