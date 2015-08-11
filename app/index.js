'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yamljs = require('yamljs');
var yosay = require('yosay');
var spawn = require('child_process').spawn;
var shell = require('shelljs');
var crypto = require('crypto');
var _ = require('underscore');
var fs = require('fs');
var mkdirp = require('mkdirp');
var mkPromptsFromParametersYml = require('./mkPromptsFromParametersYml');

var insertValue = function (doc, field, value) {
    return doc.split('<%= ' + field + ' %>').join(value);
};

var readGitRemoteLs = function (str) {
    var obj = {}, arr, i, tmp;
    arr = str.split(/\n\r?/);

    for (i = 0; i < arr.length; i += 1) {
        tmp = arr[i].split('\t');
        if (/^HEAD$|^refs\/heads|^refs\/tags/.test(tmp[1])) {
            obj[tmp[1]] = tmp[0];
        }
    }

    return obj;
};

module.exports = yeoman.generators.Base.extend({
    initializing: {
        loadPackageJson: function () {
            this.pkg = require('../package.json');
        },
        checkServer: function () {
            var cmd,
                self = this,
                unfinished = 3,
                done;

            if (process.platform === 'linux' || process.platform === 'darwin') {
                done = this.async();
                cmd = spawn('which', ['nginx']);
                cmd.stdout.on('data', function(chunk) {
                    if (/nginx/.test(chunk.toString())) {
                        self.gotNginx = true;
                    }
                });
                cmd.on('exit', function() {
                    unfinished -= 1;

                    if (unfinished === 0) {
                        done();
                    }
                });

                cmd = spawn('which', ['apache2']);
                cmd.stdout.on('data', function(chunk) {
                    if (/apache2/.test(chunk.toString())) {
                        self.gotApache = true;
                    }
                });
                cmd.on('exit', function() {
                    unfinished -= 1;

                    if (unfinished === 0) {
                        done();
                    }
                });

                cmd = spawn('which', ['httpd']);
                cmd.stdout.on('data', function(chunk) {
                    if (/httpd/.test(chunk.toString())) {
                        self.gotHttpd = true;
                    }
                });
                cmd.on('exit', function() {
                    unfinished -= 1;

                    if (unfinished === 0) {
                        done();
                    }
                });
            }
        },
        checkRequirements: function () {
            var cmd, err =[], working = [], done = this.async(), phpCommands = [], self = this;
            phpCommands.push('if(function_exists("curl_version")) {echo "\\ncurl";} else {error_log("\\ncurl");}');
            phpCommands.push('if(extension_loaded("pdo_sqlite")) {echo "\\nsqlite";} else {error_log("\\nsqlite");}');
            phpCommands.push('if(extension_loaded("pdo_mysql")) {echo "\\nmysql";} else {error_log("\\nmysql");}');
            phpCommands.push('if(extension_loaded("pdo_pgsql")) {echo "\\npqsql";} else {error_log("\\npgsql");}');
            // PHP-CLI
            try {
                cmd = spawn('php', ['-r', phpCommands.join(' ')]);
            } catch (e) {
                console.error(chank.red('You have to have an installed version of php-cli!'));
                console.error('You have to install "php5-cli" to your os first!');
                process.exit(1);
            } finally {
                cmd.stdin.end();
                cmd.stderr.on('data', function (data) {
                    err.push(data.toString());
                });
                cmd.stdout.on('data', function (data) {
                    working.push(data.toString());
                });
                cmd.on('close', function () {
                    err = err.join(' ');
                    if (err.indexOf('sqlite') >= 0) {
                        console.error(chalk.yellow('You have no PDO for sqlite!'));
                        console.error('You have to install "php5-pgsql" to your os, if you want to use a sqlite database!');
                        console.error('');
                        self.noSqlite = true;
                    }
                    if (err.indexOf('mysql') >= 0) {
                        console.error(chalk.yellow('You have no PDO for MySQL!'));
                        console.error('You have to install "php5-pgsql" to your os, if you want to use a MySQL database!');
                        console.error('');
                        self.noMysql = true;
                    }
                    if (err.indexOf('pgsql') >= 0) {
                        console.error(chalk.yellow('You have no PDO for PostgreSQL!'));
                        console.error('You have to install "php5-pgsql" to your os, if you want to use a PostgreSQL database!');
                        console.error('');
                        self.noPgsql = true;
                    }
                    if (err.indexOf('curl') >= 0) {
                        console.error(chalk.red('You have no working version of php-curl!'));
                        console.error('You have to install "php5-curl" to your os first!');
                        process.exit(1);
                    }
                    if (self.noSqlite && self.noMysql && self.noPgsql) {
                        console.error(chalk.red('You need to have at least one PDO driver installed!'));
                        console.error('Please install one PDO driver first!');
                        process.exit(1);
                    }
                    done();
                });
            }
        }
    },
    prompting: {
        yosay: function () {
            // Have Yeoman greet the user.
            this.log(yosay(
                'Welcome to the majestic ' + chalk.red('Mapbender') + ' generator!'
            ));
        },
        repository: function () {
            // git ls-remote  git://github.com/mapbender/mapbender-starter

            var done = this.async(),
                self = this,
                prompts = [
                    {
                        type: 'input',
                        name: 'projectName',
                        message: 'Enter project name:',
                        default: 'my-mapbender-app',
                        validate: function (value){
                            if (fs.existsSync(self.destinationPath(value))) {
                                return 'There is already a directory with this name, choose another...';
                            }
                            return true;
                        }
                    }, {
                        type: 'input',
                        name: 'gitUrl',
                        message: 'Enter the git url of a mapbender-starter package to fetch:',
                        default: 'git://github.com/mapbender/mapbender-starter'
                    }];
            this.prompt(prompts, function (props) {
                var cmd, stdout = [];
                self.settings = props;
                cmd = spawn('git', ['ls-remote', props.gitUrl]);

                cmd.stdout.on('data', function(chunk){
                    stdout.push(chunk.toString());
                });
                cmd.stdout.on('error', function(chunk){
                    console.error(chunk.toString());
                });
                cmd.on('close', function() {
                    var choices = [], hash, branches = readGitRemoteLs(stdout.join(''));

                    for (hash in branches) {
                        choices.push(hash);
                    }

                    self.prompt([{
                        type: 'list',
                        name: 'branch',
                        message: 'Whitch branch do you want to use?',
                        choices: choices,
                        default: 'HEAD'
                    }], function (props) {
                        var cmd;
                        self.settings.branch = props.branch;
                        self.settings.branchId = branches[props.branch];
                        console.error(chalk.green('Use branch ') + chalk.gray(self.settings.branch) + chalk.green(' with sha-1 sum ') + chalk.gray(self.settings.branchId) + chalk.green(' from ') + chalk.gray(self.settings.gitUrl));

                        cmd = spawn('git', ['clone', /*'-o', self.settings.branchId,*/ '-b', 'develop', self.settings.gitUrl, self.settings.projectName]);
                        cmd.stderr.on('data', function (chunk) {
                            console.error(chunk.toString());
                        });
                        cmd.on('exit', function(code) {
                            if (code) {
                                console.error(chalk.red('Got error while cloning. Exit-code: ' + code));
                                process.exit(2);
                            }

                            done();
                        });

                    });

                });

            });


        },
        getDatabaseType: function () {
            var databasePrompt, done = this.async(), self = this;

            databasePrompt= {
                type: 'list',
                name: 'dbType',
                message: 'Whitch database type do you want to use?',
                choices: [],
                default: 'postgreSQL'
            };
            if(!this.noSqlite) {
                databasePrompt.choices.push('Sqlite');
            }
            if(!this.noMysql) {
                databasePrompt.choices.push('MySQL');
            }
            if(!this.noPgsql) {
                databasePrompt.choices.push('PostgreSQL');
            }

            this.prompt([databasePrompt], function (props) {
                var mapping = {
                    Sqlite: 'pdo_sqlite',
                    MySQL: 'pdo_mysql',
                    PostgreSQL: 'pdo_pgsql'
                };
                self.settings.dbType = mapping[props.dbType];
                done();
            });
        },
        promptFromYaml: function () {
            var distYml,
                done = this.async(),
                self = this;

            distYml = yamljs.load(this.destinationPath(this.settings.projectName + '/application/app/config/parameters.yml.dist'));
            this.prompt(mkPromptsFromParametersYml.call(this, distYml, this.settings), function (props) {
                var yml, hash, arr, i, tmp;
                if (props.fom) {
                    props.fom = distYml.parameters.fom;
                }
                props.database_driver = self.settings.dbType;

                props.database_host = props.database_host || null;
                props.database_port = props.database_port || null;
                props.database_name = props.database_name || null;
                props.database_path = props.database_path || null;
                props.database_user = props.database_user || null;
                props.database_password = props.database_password || null;

                for (hash in props) {
                    if (props.hasOwnProperty(hash) && hash.indexOf(' -> ') >= 0) {
                        arr = hash.split(' -> ');
                        tmp = props;
                        for (i = 0; i < arr.length - 1; i += 1) {
                            if (!tmp.hasOwnProperty(arr[i])) {
                                tmp[arr[i]] = tmp[arr[i]] || {};
                            }
                            tmp = tmp[arr[i]];
                        }
                        tmp[arr[arr.length - 1]] = props[hash];
                        delete props[hash];
                    }
                }

                yml = '# Generated with ' + self.pkg.name + '#' + self.pkg.version + '\n';
                yml += yamljs.stringify({parameters: props}).split('""').join('~');
                console.log(chalk.green('This is your configuration saved in parameters.yml:'));
                console.log(yml);
                fs.writeFileSync(self.destinationPath(self.settings.projectName + '/application/app/config/parameters.yml'), yml);
                done();
            });
        },
        configurePrompting: function () {
            var done = this.async(), self = this;

            var prompts = [ /*{
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
            }/*, {
                type: 'checkbox',
                name: 'configureServer',
                message: 'Which server do you want to configure:',
                choices: (function(){
                    return [{
                        name: 'Nginx',
                        checked: !!self.gotNginx
                    },{
                        name: 'Apache',
                        checked: !!self.gotApache
                    },{
                        name: 'httpd',
                        checked: !!self.gotHttpd
                    }];
                })()
            }*/];


            this.prompt(prompts, function (props) {
                this.settings.serverUser = props.serverUser;
                this.settings.rootAccount = {username: props.rootUsername, email: props.rootEMail, passwd: props.rootPasswd};
                this.settings.import = props.import;
                done();
            }.bind(this));

        }
    },
    configuring: {
        /*gitclone: function () {
            var done = this.async();
            console.log('Cloning git repository ("' + this.gitUrl + '") to folder "' + this.projectName + '"...');
            var cmd = spawn('git', ['clone', this.gitUrl, this.projectName]);

            cmd.on('exit', function (code) {
                if (!code) {
                    console.log('');
                    console.log('Git repository fetched.');
                } else {
                    console.log('');
                    console.log('Error ' + code + ' while fetching git repository.');
                }
            });
            cmd.on('close', function () {
                done();
            });
            cmd.stderr.on('data', function (data) {
                console.log(data.toString());
            });
            cmd.stdout.on('data', function (data) {
                console.log(data.toString());
            });
            cmd.stdin.end();
        },//*/
        gitclonesubmodules: function () {
            var done = this.async();
            console.log("Cloning git submodules...");
            var cmd = spawn('git', ['submodule', 'update', '--init', '--recursive'], {cwd: './' + this.settings.projectName});

            cmd.on('exit', function (code) {
                if (!code) {
                    console.log('');
                    console.log('Git submodules fetched.');
                } else {
                    console.log('');
                    console.log('Error ' + code + ' while fetching git submodules.');
                }
            });
            cmd.on('close', function () {
                done();
            });
            cmd.stderr.on('data', function (data) {
                console.log(data.toString());
            });
            cmd.stdout.on('data', function (data) {
                console.log(data.toString());
            });
            cmd.stdin.end();
        },
        chmodLogsAndCache: function () {
            console.log('Change file permissions...');
            mkdirp.sync(this.destinationPath(this.settings.projectName + '/application/app/logs'));
            mkdirp.sync(this.destinationPath(this.settings.projectName + '/application/app/cache'));
            shell.chmod('-R', 'a+rw', this.destinationPath(this.settings.projectName + '/application/app/logs'));
            shell.chmod('-R', 'a+rw', this.destinationPath(this.settings.projectName + '/application/app/cache'));
            console.log('File permissions changed.');
        },
        addingIndexPhpForCompatibility: function () {
            var cmd,
                done = this.async();
            console.log('Setting up development php...');
            cmd = spawn('touch', [this.destinationPath(this.settings.projectName + '/application/web/index.php')]);
            cmd.on('close', function () {
                console.log('Develop php is configured.');
                done();
            });
        },
        installGrunt: function(){
            var cmd, done = this.async();
            console.log('Installing grunt');
            fs.writeFileSync(this.destinationPath(this.settings.projectName + '/package.json'), fs.readFileSync(this.templatePath('_package.json')));
            fs.writeFileSync(this.destinationPath(this.settings.projectName + '/Gruntfile.js'), fs.readFileSync(this.templatePath('Gruntfile.js')));
            cmd = spawn('npm', ['install'], {cwd: this.destinationPath(this.settings.projectName)});
            cmd.on('exit', function (code) {
                if (!code) {
                    console.log('');
                    console.log('Grunt installed.');
                } else {
                    console.log('');
                    console.error('Grunt installation exiting with status code ' + code + '.');
                }
            });
            cmd.on('close', function () {
                done();
            });
            cmd.stderr.on('data', function (data) {
                console.log(data.toString());
            });
            cmd.stdout.on('data', function (data) {
                console.log(data.toString());
            });
            cmd.stdin.end();
        }
    },
    default: {},
    writing: {
        runGruntInit: function () {
            console.log('Initialize mapbender with grunt...');
            var cmd, done = this.async();
            cmd = spawn('grunt', ['init'], {cwd: this.destinationPath(this.settings.projectName)});
            cmd.on('exit', function (code) {
                if (!code) {
                    console.log('');
                    console.log('Initialized mapbender with grunt.');
                } else {
                    console.log('');
                    console.log('Error ' + code + ' while initializing mapbender with grunt.');
                }
            });
            cmd.on('close', function () {
                done();
            });
            cmd.stderr.on('data', function (data) {
                console.log(data.toString());
            });
            cmd.stdout.on('data', function (data) {
                console.log(data.toString());
            });
            cmd.stdin.end();
        },
        importEPSGData: function () {
            if(this.settings.import.indexOf('EPSG data for proj')>=0) {
                console.log('Import EPSG data into mapbender...');
                var cmd, done = this.async();
                cmd = spawn(this.destinationPath(this.settings.projectName + '/application/app/console'), [
                        'doctrine:fixtures:load',
                        '--fixtures=./mapbender/src/Mapbender/CoreBundle/DataFixtures/ORM/Epsg/',
                        '--append'],
                    {cwd: this.destinationPath(this.settings.projectName + '/application')});
                cmd.on('exit', function (code) {
                    if (!code) {
                        console.log('');
                        console.log('EPSG data imported.');
                    } else {
                        console.log('');
                        console.log('Error ' + code + ' while importing EPSG data.');
                    }
                });
                cmd.on('close', function () {
                    done();
                });
                cmd.stderr.on('data', function (data) {
                    console.log(data.toString());
                });
                cmd.stdout.on('data', function (data) {
                    console.log(data.toString());
                });
                cmd.stdin.end();
            }
        },
        importDemoApp: function () {
            if(this.settings.import.indexOf('Demo Applications')>=0) {
                console.log('Import demo application into mapbender...');
                var cmd, done = this.async();
                cmd = spawn(this.destinationPath(this.settings.projectName + '/application/app/console'), [
                        'doctrine:fixtures:load',
                        '--fixtures=./mapbender/src/Mapbender/CoreBundle/DataFixtures/ORM/Application/',
                        '--append'],
                    {cwd: this.destinationPath(this.settings.projectName + '/application')});
                cmd.on('exit', function (code) {
                    if (!code) {
                        console.log('');
                        console.log('Demo application imported.');
                    } else {
                        console.log('');
                        console.log('Error ' + code + ' while importing demo application.');
                    }
                });
                cmd.on('close', function () {
                    done();
                });
                cmd.stderr.on('data', function (data) {
                    console.log(data.toString());
                });
                cmd.stdout.on('data', function (data) {
                    console.log(data.toString());
                });
                cmd.stdin.end();
            }
        },
        setPassword: function () {
            console.log('Set credentials for root...');
            var cmd, done = this.async();
            cmd = spawn(this.destinationPath(this.settings.projectName + '/application/app/console'), [
                'fom:user:resetroot',
                '--username=' + this.settings.rootAccount.username,
                '--email=' + this.settings.rootAccount.email,
                '--password=' + this.settings.rootAccount.passwd,
                '--silent'], {cwd: this.destinationPath(this.settings.projectName + '/application')});
            cmd.on('exit', function (code) {
                if (!code) {
                    console.log('');
                    console.log('Saved credentials for root-user.');
                } else {
                    console.log('');
                    console.log('Error ' + code + ' while saving credentials for root-user.');
                }
            });
            cmd.on('close', function () {
                done();
            });
            cmd.stderr.on('data', function (data) {
                console.log(data.toString());
            });
            cmd.stdout.on('data', function (data) {
                console.log(data.toString());
            });
            cmd.stdin.end();
        }
    },

    conflicts: {},
    install: {
        configureNginx: function () {
            //console.log('configure nginx');
        },
        configureApache: function () {
            //console.log('configure apache');
        },
        configureHttpd: function () {
            //console.log('configure httpd');
        }
    },
    end: {
        readyMessage: function () {
            console.log('');
            console.log('Mapbender is ready to use...');
            console.log('');
            console.log('Go to your project folder with "cd ' + this.settings.projectName + '".');
            console.log('If you want to try out your mapbender call "grunt run" in your new project folder...');
            console.log('');
        }
    }


});
