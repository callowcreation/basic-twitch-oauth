/*!
 * basic-twitch-oauth
 * Copyright(c) 2019-present caLLowCreation
 * MIT Licensed
 */

'use strict';

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

function getBasicHeaders(client_id, client_secret) {
	return {
		'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
	};
}

function getBearerHeaders(client_id, access_token) {
	return {
		'Authorization': 'Bearer ' + access_token,
		'Client-ID': client_id,
		'Content-Type': 'application/json'
	}
}

async function checkStatus(res) {
	if (!res.ok) throw new Error(res.statusText);
	return res; // res.status >= 200 && res.status < 300
}

async function toResult(res) {
	const contentType = res.headers.get('content-type');
	return contentType && contentType.includes('application/json') ? res.json() : res.text();
}

function TwitchOAuth({ client_id, client_secret, redirect_uri, scopes }, state) {

	this.secondsOff = 60;

	this.client_id = client_id;
	this.client_secret = client_secret;
	this.redirect_uri = redirect_uri;
	this.scopes = scopes.join(' ');

	this.state = state;

	this.authenticated = {
		access_token: null,
		refresh_token: null,
		expires_in: 0,
		expires_time: 0
	};

	const urlParams = [
		`client_id=${this.client_id}`,
		`redirect_uri=${encodeURIComponent(this.redirect_uri)}`,
		`response_type=code`,
		`scope=${encodeURIComponent(this.scopes)}`,
		`state=${state}`
	];
	const urlQuery = urlParams.join('&');

	this.authorizeUrl = `https://id.twitch.tv/oauth2/authorize?${urlQuery}`
}

/**
 * 
 * @param state Your unique token, generated by your application. 
 * This is an OAuth 2.0 opaque value, used to avoid CSRF attacks. 
 * This value is echoed back in the response. 
 * We strongly recommend you use this.
 * 
 * @throws When state are not an exact match
 * 
 */
TwitchOAuth.prototype.confirmState = function (state) {
	if (state !== this.state) throw new Error(`Authorization failed ${state} mismatch`);
};

TwitchOAuth.prototype.setAuthenticated = async function ({ access_token, refresh_token, expires_in }) {
	this.authenticated.access_token = access_token;
	this.authenticated.refresh_token = refresh_token;
	this.authenticated.expires_in = expires_in;

	const d = new Date();
	const seconds = Math.round(d.getTime() / 1000);
	this.authenticated.expires_time = (seconds + this.authenticated.expires_in) - this.secondsOff;
};

/**
 * 
 * @param code The OAuth 2.0 authorization code is a 30-character, 
 * randomly generated string.  It is used to make a request to the 
 * token endpoint in exchange for an access token.
 * 
 * @throws When request fails
 * 
 */
TwitchOAuth.prototype.fetchToken = async function (code) {
	return fetch('https://id.twitch.tv/oauth2/token', {
		method: 'POST',
		headers: getBasicHeaders(this.client_id, this.client_secret),
		body: new URLSearchParams({
			client_id: this.client_id,
			client_secret: this.client_secret,
			code: code,
			grant_type: 'authorization_code',
			redirect_uri: this.redirect_uri
		})
	}).then(checkStatus).then(toResult).then(json => this.setAuthenticated(json));
};

TwitchOAuth.prototype.fetchRefreshToken = async function () {
	return fetch('https://id.twitch.tv/oauth2/token', {
		method: 'POST',
		headers: getBasicHeaders(this.client_id, this.client_secret),
		body: new URLSearchParams({
			client_id: this.client_id,
			client_secret: this.client_secret,
			grant_type: 'refresh_token',
			refresh_token: this.authenticated.refresh_token
		})
	}).then(checkStatus).then(toResult).then(json => this.setAuthenticated(json));
};

TwitchOAuth.prototype.refreshTokenIfNeeded = async function () {
	const d = new Date();
	const seconds = Math.round(d.getTime() / 1000);

	if (seconds > this.authenticated.expires_time) {
		return this.fetchRefreshToken();
	}

	return Promise.resolve();
};

TwitchOAuth.prototype.fetchEndpoint = async function (url, options) {
	return this.refreshTokenIfNeeded().then(() => fetch(url, options).then(checkStatus).then(toResult));
};

/**
 * 
 * @param url Fully qualified URL.
 * 
 * @throws When request fails
 * 
 */
TwitchOAuth.prototype.getEndpoint = async function (url) {
	return this.fetchEndpoint(url, {
		method: 'GET',
		headers: getBearerHeaders(this.client_id, this.authenticated.access_token)
	});
};

/**
 * 
 * @param url Fully qualified URL.
 * @param body stringify json object.
 * 
 * @throws When request fails
 * 
 */
TwitchOAuth.prototype.postEndpoint = async function (url, body) {
	return this.fetchEndpoint(url, {
		method: 'POST',
		headers: getBearerHeaders(this.client_id, this.authenticated.access_token),
		body: typeof body !== 'string' ? JSON.stringify(body) : body
	});
};

/**
 * 
 * @param url Fully qualified URL.
 * @param body stringify json object.
 * 
 * @throws When request fails
 * 
 */
TwitchOAuth.prototype.putEndpoint = async function (url, body) {
	return this.fetchEndpoint(url, {
		method: 'PUT',
		headers: getBearerHeaders(this.client_id, this.authenticated.access_token),
		body: typeof body !== 'string' ? JSON.stringify(body) : body
	});
};

/**
 * 
 * @param url Fully qualified URL.
 * @param body stringify json object.
 * 
 * @throws When request fails
 * 
 */
TwitchOAuth.prototype.patchEndpoint = async function (url, body) {
	return this.fetchEndpoint(url, {
		method: 'PATCH',
		headers: getBearerHeaders(this.client_id, this.authenticated.access_token),
		body: typeof body !== 'string' ? JSON.stringify(body) : body
	});
};

/**
 * 
 * @param url Fully qualified URL.
 * 
 * @throws When request fails
 * 
 */
TwitchOAuth.prototype.deleteEndpoint = async function (url) {
	return this.fetchEndpoint(url, {
		method: 'DELETE',
		headers: getBearerHeaders(this.client_id, this.authenticated.access_token)
	});
};

module.exports = TwitchOAuth;