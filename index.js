'use strict';

const TwitchOAuth = require('./src/twitch-oauth');

if (module === require.main) {
    if (process.argv[2] && process.argv[2] === '-a') {
        console.log('App access implementation.');
        const { appAccess } = require('./example/flows');
        appAccess.listen();
    } else if (process.argv[2] && process.argv[2] === '-u') {
        console.log('User access implementation.');
        const { userAccess } = require('./example/flows');
        userAccess.listen();
    } else {
        console.log('Deprecated user access implementation.');
        require('dotenv').config();

        const express = require('express');
        const crypto = require('crypto');
        const qs = require('querystring');
    
        const app = express();
    
        const buffer = crypto.randomBytes(16);
        const state = buffer.toString('hex');
    
        const twitchOAuth = new TwitchOAuth({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            redirect_uri: process.env.REDIRECT_URI,
            scopes: [
                'user:edit:broadcast',
                'viewing_activity_read',
                'user:edit:follows'
            ]
        }, state);
    
        /**
         * 
         * @returns ds: Local Date String, ts: Local Time String
         * 
         */
        function getLogDateTime() {
            const date = new Date();
            return { ds: date.toLocaleDateString(), ts: date.toLocaleTimeString() };
        }
    
        app.get('/', (req, res) => {
            res.status(200).send(`<a href="/authorize">Authorize</a>`);
        });
    
        app.get('/home', (req, res) => {
            res.status(200).send(`<a href="/test">Test</a>`);
        });
    
        app.get('/test', async (req, res) => {
            const url = `https://api.twitch.tv/helix/users/extensions?user_id=${101223367}`;
    
            try {
                const json = await twitchOAuth.getEndpoint(url);
                res.status(200).json({ json });
            } catch (err) {
                console.error(err);
                res.redirect('/failed');
            }
        });
    
        app.get('/authorize', (req, res) => {
            res.redirect(twitchOAuth.authorizeUrl);
        });
    
        app.get('/auth-callback', async (req, res) => {
            const req_data = qs.parse(req.url.split('?')[1]);
            const code = req_data['code'];
            const state = req_data['state'];
    
            try {
                twitchOAuth.confirmState(state);
                await twitchOAuth.fetchToken(code);
                const { ds, ts } = getLogDateTime();
                console.log(`authenticated ${ts} ${ds}`);
                res.redirect('/home');
            } catch (err) {
                console.error(err);
                res.redirect('/failed');
            }
        });
    
        app.get('/validate', async (req, res) => {
            try {
                const validated = await twitchOAuth.validate();
                const { ds, ts } = getLogDateTime();
                console.log(`validated: ${validated} ${ts} ${ds}`);
                res.redirect(`/home?validated=${validated}`);
            } catch (error) {
                console.error(err);
                res.redirect(`/failed?validated`);
            }
        });
    
        app.get('/revoke', async (req, res) => {
            try {
                const revoked = await twitchOAuth.revoke();
                const { ds, ts } = getLogDateTime();
                console.log(`revoked: ${revoked} ${ts} ${ds}`);
                res.redirect(`/home?revoked=${revoked}`);
            } catch (error) {
                console.error(err);
                res.redirect(`/failed?revoked`);
            }
        });
    
        const server = app.listen(process.env.PORT || 4000, () => {
            const port = server.address().port;
            console.log(`Server listening on port ${port}`);
    
            const url = twitchOAuth.authorizeUrl;
            const open = require('open');
            open(url);
        });
    }
}

module.exports = TwitchOAuth;
