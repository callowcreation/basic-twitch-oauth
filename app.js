'use strict';

if (process.argv[2] && process.argv[2] === '-a') {
    console.log('App access implementation.');
    const { listen } = require('./flow-examples/app-access');
    listen();
} else {
    console.log('User access implementation.');
    const { listen } = require('./flow-examples/user-access');
    listen();
}