require('dotenv').config();

const express = require('express');
const qs = require('querystring');

const TwitchOAuth = require('./src/twitch-oauth');

const app = express();

const twitchOAuth = new TwitchOAuth({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uri: process.env.REDIRECT_URI,
    scopes: [
        'user:edit:broadcast',
        'channel_check_subscription'
    ]
});

if (module === require.main) {

    app.get('/', (req, res) => {
        res.status(200).send(`<a href="/login">Login</a>`);
    });

    app.get('/login', (req, res) => {
        res.redirect(twitchOAuth.authorizeUrl);
    });

    app.get('/auth-callback', (req, res) => {
        const req_data = qs.parse(req.url.split('?')[1]);
        const code = req_data['code'];

        twitchOAuth.fetchToken(code).then(json => {
            if (json.redirect_uri) {
                twitchOAuth.setAuthenticated(json);
                console.log('authenticated');
            }
            res.redirect('/');
        });

    });

    const server = app.listen(process.env.PORT || 4000, () => {
        const port = server.address().port;
        console.log(`App listening on port ${port}`);
    });

}
module.exports = app;
