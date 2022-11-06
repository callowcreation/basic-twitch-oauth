'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const express = require("express");
const crypto = require("crypto");
const qs = require("querystring");
const open = require("open");
const twitch_oauth_1 = require("./twitch-oauth");
class LogLocaleDateTime {
    constructor(date) {
        this.ds = date.toLocaleDateString();
        this.ts = date.toLocaleTimeString();
    }
    /**
     *
     * @returns ds: Local Date String, ts: Local Time String
     *
     */
    static make() {
        const date = new Date();
        return new LogLocaleDateTime(date);
    }
}
//dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 4000;
const buffer = crypto.randomBytes(16);
const state = buffer.toString('hex');
const twitchOAuth = new twitch_oauth_1.default({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uri: process.env.REDIRECT_URI,
    scopes: [
        'user:edit:broadcast',
        'viewing_activity_read',
        'user:edit:follows'
    ]
}, state);
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
        //const json = await twitchOAuth.get<T>(url);
        res.status(200).json({ json });
    }
    catch (err) {
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
        const { ds, ts } = LogLocaleDateTime.make();
        console.log(`authenticated ${ts} ${ds}`);
        res.redirect('/home');
    }
    catch (err) {
        console.error(err);
        res.redirect('/failed');
    }
});
app.get('/validate', async (req, res) => {
    try {
        const validated = await twitchOAuth.validate();
        const { ds, ts } = LogLocaleDateTime.make();
        console.log(`validated: ${validated} ${ts} ${ds}`);
        res.redirect(`/home?validated=${validated}`);
    }
    catch (error) {
        console.error(error);
        res.redirect(`/failed?validated`);
    }
});
app.get('/revoke', async (req, res) => {
    try {
        const revoked = await twitchOAuth.revoke();
        const { ds, ts } = LogLocaleDateTime.make();
        console.log(`revoked: ${revoked} ${ts} ${ds}`);
        res.redirect(`/home?revoked=${revoked}`);
    }
    catch (error) {
        console.error(error);
        res.redirect(`/failed?revoked`);
    }
});
app.listen(process.env.PORT || 4000, () => {
    console.log(`Server listening on port ${PORT}`);
    const url = twitchOAuth.authorizeUrl;
    open(url);
});
//# sourceMappingURL=example.js.map