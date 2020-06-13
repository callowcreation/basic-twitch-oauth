Basic Twitch OAuth Flow
=======================

Intended to reduce the expected prerequisite experience required for implementing Twitch OAuth to use the Twitch API(s)

<!-- TOC -->

- [Motivation](#motivation)
- [Features](#features)
- [Setup](#setup)
- [Usage](#usage)
- [Handling Exceptions](#handling-exceptions)
- [Contact](#contact)
- [License](#license)

<!-- /TOC -->

## Motivation

The statements below are still a bit beyond your experiences and you need/want to use a Twitch API… is my motivation.

Twitch API(s) now require that some endpoint request must have an authorization in the header.  To acquire an access token for a Twitch API you must be familiar with an authentication flow.  The flows supported by Twitch are Implicit code, authorization code, and client credentials.

See Twitch [Authentication Docs](https://dev.twitch.tv/docs/authentication)

Some bedtime reading [Getting Started with the Twitch API](https://dev.twitch.tv/docs/api)

## Features

- Quick setup and usage.

## Setup

[Create A Twitch App](https://dev.twitch.tv/console/apps)

Save your client ID, client secret and set your redirect URL to point to a callback url (the example below uses `/auth-callback`)

```sh
$ npm install @callowcreation/basic-twitch-oauth
```

```js
//.env config
import { config } from "dotenv"; //in this example, the info is stored in .env
config();

//other utility libraries
import express from 'express';

//the library in question
import TwitchOAuth from 'twitch-oauth';

//generated by your app
const state = 'random-string-for-security';

//the twitch oauth object itself
const twitchOAuth = new TwitchOAuth({
    client_id: process.env.CLIENT_ID || '',
    client_secret: process.env.CLIENT_SECRET || '',
    redirect_uri: process.env.REDIRECT_URI || '',
    scopes: [
        'viewing_activity_read'
    ]
}, state);

//routes for a dummy pages
const app = express();

app.get('/', (req, res) => {
    res.status(200).send(`<p>If you're seeing this in your browser, it means connection was a success.</p>`);
});

app.get('/success', (req, res) => {
    res.status(200).send(`<p>If you're seeing this, then the token retreval was successful.</p>`);
});

app.get('/failed', (req, res) => {
    res.status(400).send(`<p>If you're seeing this, then something went wrong.</p>`);
});

//receive info from twitch
app.get('/auth-callback', async (req, res) => {
    const code: string = req.query.code as string;
    const state: string = req.query.state as string;

    try {
        //check the state
        twitchOAuth.confirmState(state);

        //get the token (stored in twitchOAuth)
        await twitchOAuth.fetchToken(code);

        res.redirect('/success');

    } catch (err) {
        console.error(err);
        res.redirect('/failed');
    }
});

//open the port
app.listen(process.env.PORT || 4000, () => {
    console.log(`App listening on port ${process.env.PORT || 4000}`);

    //open the page
    const open = require('open');
    open(twitchOAuth.authorizeUrl);
});

```

## Usage

```js
app.get('/user', (req, res) => {
    const url = `https://api.twitch.tv/helix/users/extensions?user_id=101223367`;
    twitchOAuth.getEndpoint(url)
        .then(json => res.status(200).json(json));
});
```

## Handling Exceptions

```js
twitchOAuth.getEndpoint(`https://api.twitch.tv/helix/users/extensions?user_id=101223367`)
    .then(json => console.log("User Data", json))
    .catch(err => console.error(err));
```

## Contact

- [Contact caLLowCreation](http://callowcreation.com/home/contact-us/)
- [https://www.twitch.tv/callowcreation](https://www.twitch.tv/callowcreation)
- [https://twitter.com/callowcreation](https://twitter.com/callowcreation)

## License

MIT
