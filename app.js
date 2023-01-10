'use strict';

if (process.argv[2] && process.argv[2] === '-a') {
    console.log('App access implementation.');
    const { appAccess } = require('./example/flows');
    appAccess.listen();
} else {
    console.log('User access implementation.');
    const { userAccess } = require('./example/flows');
    userAccess.listen();
}