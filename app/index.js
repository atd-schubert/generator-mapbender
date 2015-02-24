'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var spawn = require('child_process').spawn;
var shell = require('shelljs');
var crypto = require('crypto');
var _ = require('underscore');
var fs = require('fs');

var insertValue = function (doc, field, value) {
  return doc.split('<%= ' + field + ' %>').join(value);
};

module.exports = yeoman.generators.Base.extend({
  initializing: function () {
    this.pkg = require('../package.json');
  },
  prompting: function () {
    var done = this.async(),// TODO: try to get two dones
      self = this;


    // Have Yeoman greet the user.
    this.log(yosay(
      'Welcome to the majestic ' + chalk.red('Mapbender') + ' generator!'
    ));

    var prompts = {
      main: [
        {
        type: 'input',
        name: 'serverName',
        message: 'Enter the server / application name:',
        default: 'my-mapbender-app'
      }, {
          type: 'input',
          name: 'gitUrl',
          message: 'Enter the github url of a mapbender-starter package to fetch:',
          default: 'git://github.com/mapbender/mapbender-starter'
        }, {
          type: 'input',
          name: 'secret',
          message: 'Session secret:',
          default: (function(){
            var sha1 = crypto.createHash('sha1');
            sha1.update((Date.now() * Math.random()).toString());
            return sha1.digest('hex');
          })()
        }, /*{
          type: 'input',
          name: 'serverUser',
          message: 'Enter the name of the unix-user for the webserver:',
          default: 'www-data'
        },*/ {
          type: 'input',
          name: 'rootUsername',
          message: 'Enter the root-backend-user username:',
          default: 'root'
        },  {
          type: 'input',
          name: 'rootEMail',
          message: 'Enter an email address for the root-backend-user:'
        }, {
        type: 'password',
        name: 'rootPasswd',
        message: 'Enter a password for the root-backend-user:',
        default: 'root'
      }, {
          type: 'list',
          name: 'dbType',
          message: 'Whitch database do you want to use?',
          choices: ['postgreSQL' ,'MySQL' ,'sqlite'],
          default: 'postgreSQL'
      }],
      sqlite: [{
        type: 'input',
        name: 'dbPath',
        message: 'Database path:',
        default: '%kernel.root_dir%/db/database.sqlite'
      }],

      postgresql: [
        {
        type: 'input',
        name: 'dbHost',
      message: 'PostgreSQL database host address:',
        default: 'localhost'
      }, {
        type: 'input',
        name: 'dbPort',
      message: 'PostgreSQL database port:',
        default: '5432'
      }, {
        type: 'input',
        name: 'dbName',
        message: 'Name of the database:',
        default: 'mapbender'
      }, {
        type: 'input',
        name: 'dbUser',
      message: 'PostgreSQL Username:',
        default: 'psql'
      }, {
        type: 'password',
        name: 'dbPassword',
      message: 'PostgreSQL User password:'
      }],

      mysql: [
        {
        type: 'input',
        name: 'dbHost',
        message: 'MySQL database host address:',
        default: 'localhost'
      }, {
        type: 'input',
        name: 'dbPort',
        message: 'MySQL database port:',
        default: '3306'
      }, {
        type: 'input',
        name: 'dbName',
        message: 'Name of the database:',
        default: 'mapbender'
      }, {
        type: 'input',
        name: 'dbUser',
        message: 'MySQL Username:',
        default: 'mysql'
      }, {
        type: 'password',
        name: 'dbPassword',
        message: 'MySQL User password:'
      }]
    };


    this.prompt(prompts.main, function (props) {
      this.dbType = props.dbType;
      this.serverName = props.serverName;
      this.serverUser = props.serverUser;
      this.secret = props.secret;
      this.gitUrl = props.gitUrl;
      this.rootAccount = {username: props.rootUsername, email: props.rootEMail, passwd: props.rootPasswd};

      if (this.dbType === "postgreSQL") {
        this.dbType = 'pdo_pgsql';
        this.prompt(prompts.postgresql, function (props) {
          _.extend(this, props);
          done();
        }.bind(self));
      }
      if (this.dbType === "MySQL") {
        this.dbType = 'pdo_mysql';
        this.prompt(prompts.mysql, function (props) {
          _.extend(this, props);
          done();
        }.bind(self));
      }
      if (this.dbType === "sqlite") {
        this.dbType = 'pdo_sqlite';
        this.prompt(prompts.sqlite, function (props) {
          _.extend(this, props);
          done();
        }.bind(self));
      }
    }.bind(self));



  },
  gitclone: function () {
    var done = this.async();
    console.log('Cloning git repository ("' + this.gitUrl + '") to folder "' + this.serverName + '"...');
    var cmd = spawn('git', ['clone', this.gitUrl, this.serverName]);
    cmd.on('close', function (){
      console.log('Git repository fetched.');
      done();
    });
    cmd.stdin.end();
  },

  gitclonesubmodules: function () {
    var done = this.async();
    console.log("Cloning git submodules...");
    var cmd = spawn('git', ['submodule', 'update', '--init', '--recursive'], {cwd: './' + this.serverName});
    cmd.on('close', function (){
      console.log('Git submodules fetched.');
      done();

    });
    cmd.stdin.end();
  },
  chmodLogsAndCache: function () {
    console.log('Change file permissions...');
    shell.chmod('-R', 'a+rw', this.destinationPath(this.serverName + '/application/app/logs'));
    shell.chmod('-R', 'a+rw', this.destinationPath(this.serverName + '/application/app/cache'));
    console.log('File permissions changed.');
  },
  setParametersYml: function () {
    console.log('Create parameters.yml');
    var yml = fs.readFileSync(this.templatePath('parameters.yml')).toString();
    yml = insertValue(yml, 'dbType', this.dbType);
    yml = insertValue(yml, 'dbHost', this.dbHost || '~');
    yml = insertValue(yml, 'dbPort', this.dbPort || '~');
    yml = insertValue(yml, 'dbName', this.dbName || '~');
    yml = insertValue(yml, 'dbPath', this.dbPath || '~');
    yml = insertValue(yml, 'dbUser', this.dbUser || '~');
    yml = insertValue(yml, 'dbPassword', this.dbPassword || '~');

    yml = insertValue(yml, 'secret', this.secret || '~');

    fs.writeFileSync(this.destinationPath(this.serverName + '/application/app/config/parameters.yml'), yml);
    console.log('parameters.yml created...');
  },
  installGrunt: function(){
    var cmd, done = this.async();
    console.log('Installing grunt');
    fs.writeFileSync(this.destinationPath(this.serverName + '/package.json'), fs.readFileSync(this.templatePath('_package.json')));
    fs.writeFileSync(this.destinationPath(this.serverName + '/Gruntfile.js'), fs.readFileSync(this.templatePath('Gruntfile.js')));
    cmd = spawn('npm', ['install'], {cwd: this.destinationPath(this.serverName)});
    cmd.on('close', function () {
      console.log('Grunt installed.');
      done();
    });
    cmd.stdin.end();
  },
  runGruntInit: function () {
    console.log('Initialize mapbender with grunt...');
    var cmd, done = this.async();
    cmd = spawn('grunt', ['init'], {cwd: this.destinationPath(this.serverName)});
    cmd.on('close', function () {
      console.log('Initialized mapbender with grunt.');
      done();
    });
  },
  setPassword: function () {
    console.log('Set credentials for root...');
    var cmd, done = this.async();
    cmd = spawn(this.destinationPath(this.serverName + '/application/app/console'), [
      'fom:user:resetroot',
      '--username=' + this.rootAccount.username,
      '--email=' + this.rootAccount.email,
      '--password=' + this.rootAccount.passwd,
      '--silent'], {cwd: this.destinationPath(this.serverName + '/application')});
    cmd.on('close', function () {
      console.log('Saved credentials for root-user.');
      done();
    });
    cmd.stdin.end();
  },
  readyMessage: function () {
    console.log('');
    console.log('Mapbender is ready now...');
    console.log('');
    console.log('Go to your project folder with "cd ' + this.serverName + '".');
    console.log('If you want to try out your mapbender call "grunt run" in your new project folder...');
    console.log('');
  }
});
