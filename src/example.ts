'use strict';
import { config } from "dotenv";
config();
import * as express from 'express';
import * as crypto from 'crypto';
import * as qs from 'querystring';
import * as open from 'open';

import TwitchOAuth from './twitch-oauth';

class LogLocaleDateTime {
    /**
     * Stores Date.toLocaleDateString
     */
    ds: string;
    /**
     * Stores Date.toLocaleTimeString
     */
    ts: string;

    /**
     * 
     * @returns ds: Local Date String, ts: Local Time String
     * 
     */
    static make(): LogLocaleDateTime {
        const date: Date = new Date();
        return new LogLocaleDateTime(date);
    }

    constructor(date: Date) {
        this.ds = date.toLocaleDateString();
        this.ts = date.toLocaleTimeString();
    }
}

//dotenv.config();

const app = express();

const PORT: number = Number(process.env.PORT) || 4000;

const buffer: Buffer = crypto.randomBytes(16);
const state: string = buffer.toString('hex');

const twitchOAuth: TwitchOAuth = new TwitchOAuth({
    client_id: process.env.CLIENT_ID as string,
    client_secret: process.env.CLIENT_SECRET as string,
    redirect_uri: process.env.REDIRECT_URI as string,
    scopes: [
        'user:edit:broadcast',
        'viewing_activity_read',
        'user:edit:follows'
    ]
}, state);

app.get('/', (req: any, res: any) => {
    res.status(200).send(`<a href="/authorize">Authorize</a>`);
});

app.get('/home', (req: any, res: any) => {
    res.status(200).send(`<a href="/test">Test</a>`);
});

app.get('/test', async (req: any, res: any) => {
    const url: string = `https://api.twitch.tv/helix/users/extensions?user_id=${101223367}`;

    try {
        const json = await twitchOAuth.getEndpoint(url);
        //const json = await twitchOAuth.get<T>(url);
        res.status(200).json({ json });
    } catch (err) {
        console.error(err);
        res.redirect('/failed');
    }
});

app.get('/authorize', (req: any, res: any) => {
    res.redirect(twitchOAuth.authorizeUrl);
});

app.get('/auth-callback', async (req: any, res: any) => {
    const req_data = qs.parse(req.url.split('?')[1]);
    const code = req_data['code'] as string;
    const state = req_data['state'] as string;

    try {
        twitchOAuth.confirmState(state);
        await twitchOAuth.fetchToken(code);
        const { ds, ts } = LogLocaleDateTime.make();
        console.log(`authenticated ${ts} ${ds}`);
        res.redirect('/home');
    } catch (err) {
        console.error(err);
        res.redirect('/failed');
    }
});

app.get('/validate', async (req: any, res: any) => {
    try {
        const validated = await twitchOAuth.validate();
        const { ds, ts } = LogLocaleDateTime.make();
        console.log(`validated: ${validated} ${ts} ${ds}`);
        res.redirect(`/home?validated=${validated}`);
    } catch (error) {
        console.error(error);
        res.redirect(`/failed?validated`);
    }
});

app.get('/revoke', async (req: any, res: any) => {
    try {
        const revoked = await twitchOAuth.revoke();
        const { ds, ts } = LogLocaleDateTime.make();
        console.log(`revoked: ${revoked} ${ts} ${ds}`);
        res.redirect(`/home?revoked=${revoked}`);
    } catch (error) {
        console.error(error);
        res.redirect(`/failed?revoked`);
    }
});

app.listen(process.env.PORT || 4000, () => {

    console.log(`Server listening on port ${PORT}`);

    const url = twitchOAuth.authorizeUrl;
    open(url);
});
