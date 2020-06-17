
import { config } from "dotenv";

import TwitchOAuth from './src/twitch-oauth';

import express from 'express';
import crypto from 'crypto';

if (module === require.main) {
	config();

	const app = express();

	const buffer = crypto.randomBytes(16);
	const state = buffer.toString('hex');

	const twitchOAuth = new TwitchOAuth({
		client_id: process.env.CLIENT_ID as string,
		client_secret: process.env.CLIENT_SECRET as string,
		redirect_uri: process.env.REDIRECT_URI as string,
		scopes: [
			'user:edit:broadcast',
			'moderation:read'
		]
	}, state);

	const error_message = 'Something went wrong <a href="/home">return home</a><br />Read more in the server terminal'
	const broadcaster_id = '75987197';

	app.get('/', (_req, res) => {
		res.status(200).send(`<a href="/authorize">Authorize</a>`);
	});

	app.get('/home', (_req, res) => {
		res.status(200).send(
			`<a href="/extensions">Example Extensions (GET request)</a><br />
			<a href="/moderation">Example AutoMod (POST request)</a><br />
			<a href="/tags">Example Tags (PUT request)</a><br /><br />`
		);
	});

	app.get('/extensions', async (_req, res) => {
		const url: string = `https://api.twitch.tv/helix/users/extensions?user_id=${broadcaster_id}`;
		try {
			const json = await twitchOAuth.getEndpoint(url);
			res.status(200).json(json);
		} catch (error) {
			console.error(error); 
			res.send(error_message); 
		}
	});

	app.get('/moderation', async (_req, res) => {
		const url: string = `https://api.twitch.tv/helix/moderation/enforcements/status?broadcaster_id=${broadcaster_id}`;
		const data = [
			{ msg_id: '0', msg_text: 'I killing this', user_id: '101223367' },
			{ msg_id: '1', msg_text: 'that was a death blow', user_id: '75987197' }
		];
		try {
			const json = await twitchOAuth.postEndpoint(url, { data });
			res.status(200).json(json);
		} catch (error) {
			console.error(error); 
			res.send(error_message); 
		}
	});

	app.get('/tags', async (_req, res) => {
		const url: string = `https://api.twitch.tv/helix/streams/tags?broadcaster_id=${broadcaster_id}`;
		const tag_ids = [
			'621fb5bf-5498-4d8f-b4ac-db4d40d401bf',
			'79977fb9-f106-4a87-a386-f1b0f99783dd'
		];
		try {
			const json = await twitchOAuth.putEndpoint(url, { tag_ids });
			res.status(200).json(json)
		} catch (error) {
			console.error(error); 
			res.send(error_message); 
		}
	});

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

	// ---- Initiate the oauth process
	// ---- Or below app.listen(process.env.PORT...
	app.get('/authorize', (_req, res) => {
		res.redirect(twitchOAuth.authorizeUrl);
	});

	// ---- Initiate the oauth process
	// ---- Or above app.get('/authorize'...
	app.listen(process.env.PORT || 4000, () => {
		console.log(`App listening on port ${process.env.PORT || 4000}`);

		const open = require('open');
		open(twitchOAuth.authorizeUrl);
	});
}