'use strict';

const TwitchAccess = require('../src/flow/app-access');

require('dotenv').config();

const express = require('express');

const app = express();

const twitchOAuth = new TwitchAccess({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
});

app.get('/', (req, res) => {
    res.status(200).send(`<a href="/test">Test</a>`);
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

app.get('/test/users', async (req, res) => {
    const url = `https://api.twitch.tv/helix/users?id=${101223367}`;

    try {
        const json = await twitchOAuth.getEndpoint(url);
        res.status(200).json({ json });
    } catch (err) {
        console.error(err);
        res.redirect('/failed');
    }
});

module.exports = {
    twitchOAuth,
    listen: function () {
        const server = app.listen(process.env.PORT || 4000, async () => {
            const port = server.address().port;
            console.log(`Server listening on port ${port}`);
            const result = await twitchOAuth.token();
            console.log({ result });
        });
    }
};
