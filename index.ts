//.env config
import { config } from "dotenv";
config();

//the library in question
import TwitchOAuth from './src/twitch-oauth';

//other utility libraries
import crypto from 'crypto';
import express from 'express';

//random number generation
const buffer = crypto.randomBytes(16);
const state = buffer.toString('hex');

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
