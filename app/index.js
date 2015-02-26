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
        var done = this.async(),
            self = this;


        // Have Yeoman greet the user.
        this.log(yosay(
            'Welcome to the majestic ' + chalk.red('Mapbender') + ' generator!'
        ));

        var prompts = {
            main: [
                {
                    type: 'input',
                    name: 'projectName',
                    message: 'Enter project name:',
                    default: 'my-mapbender-app'
                }, {
                    type: 'input',
                    name: 'gitUrl',
                    message: 'Enter the git url of a mapbender-starter package to fetch:',
                    default: 'git://github.com/mapbender/mapbender-starter'
                }, {
                    type: 'input',
                    name: 'secret',
                    message: 'Session secret for web-cookies:',
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
                    message: 'Enter the username for the root account:',
                    default: 'root'
                }, {
                    type: 'input',
                    name: 'rootEMail',
                    message: 'Enter an email address for the root account:',
                    validate: function (input){
                        return /^[a-zA-Z0-9\._\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,10}$/.test(input);
                    }
                }, {
                    type: 'password',
                    name: 'rootPasswd',
                    message: 'Enter a password for the root account:',
                    default: 'root'
                }, {
                    type: 'checkbox',
                    name: 'import',
                    message: 'Select data to import in mapbender:',
                    choices: [
                        {
                            name: 'EPSG data for proj',
                            checked: true
                        },
                        {
                            name: 'Demo Applications',
                            checked: false
                        }
                    ]
                },{
                    type: 'list',
                    name: 'dbType',
                    message: 'Whitch database type do you want to use?',
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
                    message: 'Database host address of running PostgreSQL:',
                    default: 'localhost'
                }, {
                    type: 'input',
                    name: 'dbPort',
                    message: 'PostgreSQL database port:',
                    default: '5432'
                }, {
                    type: 'input',
                    name: 'dbName',
                    message: 'Name of the (existing) database:',
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
                    message: 'Database host address of running MySQL:',
                    default: 'localhost'
                }, {
                    type: 'input',
                    name: 'dbPort',
                    message: 'MySQL database port:',
                    default: '3306'
                }, {
                    type: 'input',
                    name: 'dbName',
                    message: 'Name of the (existing) database:',
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
            this.projectName = props.projectName;
            this.serverUser = props.serverUser;
            this.secret = props.secret;
            this.gitUrl = props.gitUrl;
            this.import = props.import;
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
        console.log('Cloning git repository ("' + this.gitUrl + '") to folder "' + this.projectName + '"...');
        var cmd = spawn('git', ['clone', this.gitUrl, this.projectName]);
        cmd.on('close', function (){
            console.log('Git repository fetched.');
            done();
        });
        cmd.stdin.end();
    },

    gitclonesubmodules: function () {
        var done = this.async();
        console.log("Cloning git submodules...");
        var cmd = spawn('git', ['submodule', 'update', '--init', '--recursive'], {cwd: './' + this.projectName});
        cmd.on('close', function (){
            console.log('Git submodules fetched.');
            done();

        });
        cmd.stdin.end();
    },
    chmodLogsAndCache: function () {
        console.log('Change file permissions...');
        shell.chmod('-R', 'a+rw', this.destinationPath(this.projectName + '/application/app/logs'));
        shell.chmod('-R', 'a+rw', this.destinationPath(this.projectName + '/application/app/cache'));
        console.log('File permissions changed.');
    },
    addingIndexPhpForCompatibility: function () {
        var cmd,
            done = this.async();
        console.log('Setting up development php...');
        cmd = spawn('touch', [this.destinationPath(this.projectName + '/application/web/index.php')]);
        cmd.on('close', function () {
            console.log('Develop php is configured.');
            done();
        });
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

        fs.writeFileSync(this.destinationPath(this.projectName + '/application/app/config/parameters.yml'), yml);
        console.log('parameters.yml created...');
    },
    installGrunt: function(){
        var cmd, done = this.async();
        console.log('Installing grunt');
        fs.writeFileSync(this.destinationPath(this.projectName + '/package.json'), fs.readFileSync(this.templatePath('_package.json')));
        fs.writeFileSync(this.destinationPath(this.projectName + '/Gruntfile.js'), fs.readFileSync(this.templatePath('Gruntfile.js')));
        cmd = spawn('npm', ['install'], {cwd: this.destinationPath(this.projectName)});
        cmd.on('close', function () {
            console.log('Grunt installed.');
            done();
        });
        cmd.stdin.end();
    },
    runGruntInit: function () {
        console.log('Initialize mapbender with grunt...');
        var cmd, done = this.async();
        cmd = spawn('grunt', ['init'], {cwd: this.destinationPath(this.projectName)});
        cmd.on('close', function () {
            console.log('Initialized mapbender with grunt.');
            done();
        });
    },
    importEPSGData: function () {
        if(this.import.indexOf('EPSG data for proj')>=0) {
            console.log('Import EPSG data into mapbender...');
            var cmd, done = this.async();
            cmd = spawn(this.destinationPath(this.projectName + '/application/app/console'), [
                'doctrine:fixtures:load',
                '--fixtures=./mapbender/src/Mapbender/CoreBundle/DataFixtures/ORM/Epsg/',
                '--append'],
                {cwd: this.destinationPath(this.projectName + '/application')});
            cmd.on('close', function () {
                console.log('EPSG data imported.');
                done();
            });
            cmd.stdin.end();
        }
    },
    importDemoApp: function () {
        if(this.import.indexOf('Demo Applications')>=0) {
            console.log('Import demo application into mapbender...');
            var cmd, done = this.async();
            cmd = spawn(this.destinationPath(this.projectName + '/application/app/console'), [
                'doctrine:fixtures:load',
                '--fixtures=./mapbender/src/Mapbender/CoreBundle/DataFixtures/ORM/Application/',
                '--append'],
                {cwd: this.destinationPath(this.projectName + '/application')});
            cmd.on('close', function () {
                console.log('Demo application imported.');
                done();
            });
            cmd.stdin.end();
        }
    },
    setPassword: function () {
        console.log('Set credentials for root...');
        var cmd, done = this.async();
        cmd = spawn(this.destinationPath(this.projectName + '/application/app/console'), [
            'fom:user:resetroot',
            '--username=' + this.rootAccount.username,
            '--email=' + this.rootAccount.email,
            '--password=' + this.rootAccount.passwd,
            '--silent'], {cwd: this.destinationPath(this.projectName + '/application')});
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
        console.log('Go to your project folder with "cd ' + this.projectName + '".');
        console.log('If you want to try out your mapbender call "grunt run" in your new project folder...');
        console.log('');
    }
});
