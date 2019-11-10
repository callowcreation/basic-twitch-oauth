Basic Twitch OAuth Flow
=======================

Intended to reduce the expected prerequisite experience required for implementing Twitch OAuth to use the Twitch API(s)

<!-- TOC -->

- [Motivation](#motivation)
- [Features](#features)
- [Installation](#installation)
- [Loading and configuration](#loading-and-configuration)
- [Common Usage](#common-usage)
- [Contact](#contact)

<!-- /TOC -->

## Motivation

The statements below are still a bit beyond your experiences and you need/want to use a Twitch API… is my motivation.

Twitch API(s) now require that some endpoint request must have an authorization in the header.  To acquire an access token for a Twitch API you must be familiar with an authentication flow.  Implicit code, authorization code, and client credentials are the flows supported by Twitch.


See Twitch [Authentication Docs](https://dev.twitch.tv/docs/authentication)

## Features

- Quick setup and usage.

## Installation
[Create an App](https://dev.twitch.tv/console/apps)

Required reading [Getting Started with the Twitch API](https://dev.twitch.tv/docs/api)

```sh
$ npm install basic-twitch-oauth
```

## Loading and configuration
A Node server is required, express is used here.

```js
const TwitchOAuth = require('twitch-oauth');

const state = 'a-Unique-ID-98765432-For_Security';

const twitchOAuth = new TwitchOAuth({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uri: process.env.REDIRECT_URI,
    scopes: [
        'user:edit:broadcast'
    ]
}, state);

const express = require('express');
const app = express();

app.get('/authorize', (req, res) => {
    res.redirect(twitchOAuth.authorizeUrl);
});

// redirect_uri ends up here
app.get('/auth-callback', (req, res) => {
    const qs = require('querystring');
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

```

## Common Usage

```js
app.get('/user', (req, res) => {
    const url = `https://api.twitch.tv/helix/users/extensions?user_id=101223367`;
    twitchOAuth.getEndpoint(url)
        .then(json => res.status(200).json(json));
});
```

#### Handling exceptions

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