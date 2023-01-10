'use strict';

if (process.argv[2] && process.argv[2] === '-a') {
    console.log('App access implementation.');
    const { listen } = require('./example/flows/app-access');
    listen();
} else {
    console.log('User access implementation.');
    const { listen } = require('./example/flows/user-access');
    listen();
}