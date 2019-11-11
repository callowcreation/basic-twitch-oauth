const TwitchOAuth = require('./src/twitch-oauth');

if (module === require.main) {
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
            'viewing_activity_read'
        ]
    }, state);


    app.get('/', (req, res) => {
        res.status(200).send(`<a href="/authorize">Authorize</a>`);
    });

    app.get('/home', (req, res) => {
        res.status(200).send(`<a href="/test">Test</a>`);
    });

    app.get('/test', (req, res) => {
        const url = `https://api.twitch.tv/helix/users/extensions?user_id=${101223367}`;
        twitchOAuth.getEndpoint(url)
            .then(json => res.status(200).json(json))
            .catch(err => console.error(err));
    });

    app.get('/authorize', (req, res) => {
        res.redirect(twitchOAuth.authorizeUrl);
    });

    app.get('/auth-callback', (req, res) => {
        const req_data = qs.parse(req.url.split('?')[1]);
        const code = req_data['code'];
        const state = req_data['state'];

        if (twitchOAuth.confirmState(state) === true) {
            twitchOAuth.fetchToken(code).then(json => {
                if (json.success === true) {
                    console.log('authenticated');
                    res.redirect('/home');
                } else {
                    res.redirect('/failed');
                }
            }).catch(err => console.error(err));
        } else {
            res.redirect('/failed');
        }
    });

    const server = app.listen(process.env.PORT || 4000, () => {
        const port = server.address().port;
        console.log(`App listening on port ${port}`);

        const url = twitchOAuth.authorizeUrl;
        const open = require('open');
        open(url);
    });
}

module.exports = TwitchOAuth;
