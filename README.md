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

Twitch API(s) now require that some endpoint request must have an authorization in the header.  To acquire an access token for a Twitch API you must be familiar with an authentication flow.  The flows supported by Twitch are Implicit code, authorization code, and client credentials.


See Twitch [Authentication Docs](https://dev.twitch.tv/docs/authentication)

## Features

- Quick setup and usage.

## Installation
[Create an App](https://dev.twitch.tv/console/apps)

Required reading [Getting Started with the Twitch API](https://dev.twitch.tv/docs/api)

```sh
$ npm install @callowcreation/basic-twitch-oauth
```

## Loading and configuration
A Node server is required, express is used here.

```js
import TwitchOAuth from './src/twitch-oauth';
import crypto from 'crypto';
import express from 'express';

const app = express();

const buffer = crypto.randomBytes(16);
const state = buffer.toString('hex');

const twitchOAuth = new TwitchOAuth({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uri: process.env.REDIRECT_URI,
    scopes: [
        'user:edit:broadcast',
		'moderation:read'
    ]
}, state);

// redirect_uri ends up here
app.get('/auth-callback', async (req, res) => {
	try {
		const code: string = req.query.code as string;
		const state: string = req.query.state as string;

		twitchOAuth.confirmState(state);
		
		await twitchOAuth.fetchToken(code);

		res.redirect('/home');
	} catch (err) {
		console.error(err);
		res.send(error_message); 
	}
});

```

## Common Usage

```js
app.get('/extensions', async (req, res) => {
	const url: string = `https://api.twitch.tv/helix/users/extensions?user_id=${broadcaster_id}`;
	const json = await twitchOAuth.getEndpoint(url);
	res.status(200).json(json);
});
```

#### Handling exceptions

```js
try {
	const url: string = `https://api.twitch.tv/helix/moderation/enforcements/status?broadcaster_id=${broadcaster_id}`;
	const data = [
		{ msg_id: '0', msg_text: 'I killing this', user_id: '101223367' },
		{ msg_id: '1', msg_text: 'that was a death blow', user_id: '75987197' }
	];
	const json = await twitchOAuth.postEndpoint(url, { data });
	res.status(200).json(json);
} catch (error) {
	console.error(error); 
	res.send(error_message); 
}
```

## Contact
- [Contact caLLowCreation](http://callowcreation.com/home/contact-us/)
- [https://www.twitch.tv/callowcreation](https://www.twitch.tv/callowcreation)
- [https://twitter.com/callowcreation](https://twitter.com/callowcreation)

## License

MIT
