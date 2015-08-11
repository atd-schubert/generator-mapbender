'use strict';

var crypto = require('crypto');

var mkPromptsFromParametersYml = function (obj, settings) {
    var hash, result = [], enabled = {}, databasePrompt;

    for (hash in obj.parameters) {

        switch (hash) {
            case 'database_driver':
                break;
            case 'database_host':
                if (settings.dbType === 'pdo_sqlite') {
                    break;
                }
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter database hostname:',
                    default: 'localhost'
                });
                break;
            case 'database_port':
                if (settings.dbType === 'pdo_sqlite') {
                    break;
                }
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter database port:',
                    default: (function(type){
                        if(type === 'pdo_psql') {
                            return 5432;
                        }
                        return 3306;// mysql

                    })(settings.dbType),
                    validate: function (val) {
                        if (!/^[0-9]+$/.test(val)) {
                            return 'A port has to be a number';
                        }
                        return true;
                    }
                });
                break;
            case 'database_name':
                if (settings.dbType === 'pdo_sqlite') {
                    break;
                }
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter name of an existing database-collection:',
                    default: 'mapbender'
                });
                break;
            case 'database_path':
                if (settings.dbType !== 'pdo_sqlite') {
                    break;
                }
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter path to database:',
                    default: '%kernel.root_dir%/db/database.sqlite'
                });
                break;
            case 'database_user':
                if (settings.dbType === 'pdo_sqlite') {
                    break;
                }
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter username for database:',
                    default: (function(type){
                        if(type === 'pdo_psql') {
                            return 'psql';
                        } else if (type === 'pdo_mysql') {
                            return 'mysql';
                        }
                        return '';// mysql

                    })(settings.dbType)
                });
                break;
            case 'database_password':
                if (settings.dbType === 'pdo_sqlite') {
                    break;
                }
                result.push({
                    type: 'password',
                    name: hash,
                    message: 'Enter password for database-user:'
                });
                break;
            case 'fom':
                result.push({
                    type: 'confirm',
                    name: hash,
                    message: 'Do you want to insert fom defaults to config?',
                    default: true
                });
                break;
            /*case 'mailer_transport':
             case 'mailer_host':
             case 'mailer_user':
             case 'mailer_password':
             enabled.mailer = true;
             break;
             case 'ows_proxy3_logging':
             case 'ows_proxy3_obfuscate_client_ip':
             case 'ows_proxy3_host':
             case 'ows_proxy3_port':
             case 'ows_proxy3_connecttimeout':
             case 'ows_proxy3_timeout':
             case 'ows_proxy3_user':
             case 'ows_proxy3_password':
             case 'ows_proxy3_noproxy':
             enabled.ows = true;
             break;*/
            case 'secret':
                if(obj.parameters[hash] === 'ThisTokenIsNotSoSecretChangeIt') {
                    result.push({
                        type: 'input',
                        name: hash,
                        message: 'Session secret for web-cookies:',
                        default: (function(){
                            var sha1 = crypto.createHash('sha1');
                            sha1.update((Date.now() * Math.random()).toString());
                            return sha1.digest('hex');
                        })()
                    });
                } else {
                    result.push({
                        type: 'input',
                        name: hash,
                        message: 'Session secret for web-cookies:',
                        default: obj.parameters[hash]
                    });
                }
                break;
            case 'locale':
            case 'fallback_locale':
                result.push({
                    type: 'list',
                    name: hash,
                    message: 'Select language for ' + hash,
                    choices: ['en', 'de', 'it', 'es'],
                    default: 'en'
                });

                break;
            case 'ldap_host':
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter LDAP hostname',
                    validate: function (val) {
                        if(/^ldaps?:\/\/[a-zA-Z0-9\.\-_]+/.test(val)) {
                            return true;
                        }
                        return 'This is not a valid ldap-hostname (you have to specify a protocol ldap:// or ldaps://)';
                    }
                });
                break;
            case 'ldap_port':
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter LDAP port',
                    default: 389,
                    validate: function (val) {
                        val = parseInt(val)
                        if(val > 0 && val <= 65535) {
                            return true;
                        }
                        return 'Port is out of range (1-65535)!';
                    }
                });
                break;
            case 'ldap_version':
                result.push({
                    type: 'list',
                    name: hash,
                    message: 'Enter LDAP-Version',
                    choices: ['3', '2']
                });
                break;
            case 'ldap_user_base_dn':
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter distinguished name where users are stored in LDAP dictionary'
                });
                break;
            case 'ldap_user_name_attribute':
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter attribute name that determinate the username (login-name) in LDAP dictionary',
                    default: 'uid'
                });
                break;
            case 'ldap_role_base_dn':
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter distinguished name where roles are stored in LDAP dictionary'
                });
                break;
            case 'ldap_role_name_attribute':
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter attribute name that determine the rolename',
                    default: 'cn'
                });
                break;
            case 'ldap_role_user_attribute':
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter attribute name to check if user is in a group',
                    default: 'memberUid'
                });
                break;
            case 'ldap_role_user_id':

                result.push({
                    type: 'list',
                    name: hash,
                    message: 'Enter how to determinate user in ldap_role_user_attribute. (username or distinguished name?)',
                    choices: ['username', 'dn']
                });
                break;
            case 'ldap_bind_dn':
                result.push({
                    type: 'input',
                    name: hash,
                    message: 'Enter distinguished name for prebind if ldap only allow access for binded request'
                });
                break;
            case 'ldap_bind_pwd':
                result.push({
                    type: 'password',
                    name: hash,
                    message: 'Enter password for prebinded user'
                });
                break;

            default:
                if (obj.parameters[hash] === null) {
                    result.push({
                        type: 'input',
                        name: hash,
                        message: 'Enter value for ' + hash + ':',
                        default: null
                    });
                }
                else if (typeof obj.parameters[hash] === 'object') {
                    var subs = {};
                    var subHash;
                    var i;

                    for (subHash in obj.parameters[hash]) {
                        if (obj.parameters[hash].hasOwnProperty(subHash)) {
                            subs[hash + ' -> ' + subHash] = obj.parameters[hash][subHash];
                        }
                    }
                    var subPrompts = mkPromptsFromParametersYml({parameters: subs}, settings);
                    for (i = 0; i < subPrompts.length; i += 1) {
                        result.push(subPrompts[i]);
                    }
                } else if (typeof obj.parameters[hash] === 'boolean') {
                    result.push({
                        type: 'confirm',
                        name: hash,
                        message: 'Do you want wo enable ' + hash + ':',
                        default: obj.parameters[hash]
                    });
                } else if (typeof obj.parameters[hash] === 'number') {
                    result.push({
                        type: 'input',
                        name: hash,
                        message: 'Enter value for ' + hash + ':',
                        default: obj.parameters[hash],
                        validate: function (val) {
                            if (!/^[0-9]*$/.test(val)) {
                                return 'This is not a number!';
                            }
                            return true;
                        }
                    });
                } else if (typeof obj.parameters[hash] === 'string') {
                    if (/(passwd)|(password)/.test(hash)) {
                        result.push({
                            type: 'password',
                            name: hash,
                            message: 'Enter password for ' + hash + ':',
                            default: obj.parameters[hash]
                        });
                    } else {
                        result.push({
                            type: 'input',
                            name: hash,
                            message: 'Enter value for ' + hash + ':',
                            default: obj.parameters[hash]
                        });
                    }

                }
        }
    }
    return result;
};

module.exports = mkPromptsFromParametersYml;