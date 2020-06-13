/*!
 * basic-twitch-oauth
 * Copyright(c) 2019-present caLLowCreation
 * MIT Licensed
 */

import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

interface TwitchOAuthOptions {
	client_id: string,
	client_secret: string,
	redirect_uri: string,
	scopes: string[]
}

interface Authenticated {
	access_token: string,
	refresh_token: string,
	expires_in: number,
	expires_time: number
}

interface TokenOptions {
	access_token: string,
	refresh_token: string,
	expires_in: number
}

const DOMAIN: string = 'https://id.twitch.tv/oauth2';

class TwitchOAuth {

	private secondsOff: number = 60;
	private oauthOptions: TwitchOAuthOptions;
	private state: string;
	
	private authenticated: Authenticated = {
		access_token:  '',
		refresh_token: '',
		expires_in: 0,
		expires_time: 0
	};

	constructor(oauthOptions: TwitchOAuthOptions, state: string) {
		this.oauthOptions = oauthOptions;
		this.state = state;
	}

	private get scopes(): string {
		return this.oauthOptions.scopes.join(' ');
	}

	get authorizeUrl(): string {
		const urlParams = [
			`client_id=${this.oauthOptions.client_id}`,
			`redirect_uri=${encodeURIComponent(this.oauthOptions.redirect_uri)}`,
			`response_type=code`,
			`scope=${encodeURIComponent(this.scopes)}`,
			`state=${this.state}`
		];
		return `${DOMAIN}/authorize?${urlParams.join('&')}`;
	}

	confirmState(state: string): boolean {
		return state === this.state;
	}

	async fetchToken(code: string): Promise<Authenticated> {
		return fetch(`${DOMAIN}/token`, {
			method: 'POST',
			headers: this.getBasicHeaders(this.oauthOptions.client_id, this.oauthOptions.client_secret),
			body: new URLSearchParams({
				client_id: this.oauthOptions.client_id,
				client_secret: this.oauthOptions.client_secret,
				code: code,
				grant_type: 'authorization_code',
				redirect_uri: this.oauthOptions.redirect_uri
			})
		})
			.then(result => result.json())
			.then((json: TokenOptions) => {
				this.setAuthenticated(json);
				return this.authenticated;
			})
			.catch(e => e);
	}

	async fetchRefreshToken(): Promise<Authenticated> {
		return fetch(`${DOMAIN}/token`, {
			method: 'POST',
			headers: this.getBasicHeaders(this.oauthOptions.client_id, this.oauthOptions.client_secret),
			body: new URLSearchParams({
				client_id: this.oauthOptions.client_id,
				client_secret: this.oauthOptions.client_secret,
				grant_type: 'refresh_token',
				refresh_token: this.authenticated.refresh_token
			})
		})
			.then(result => result.json())
			.then((json: TokenOptions) => {
				this.setAuthenticated(json);
				return this.authenticated;
			})
			.catch(e => e);
	}

	async refreshTokenIfNeeded(): Promise<Authenticated | null> {
		const d: Date = new Date();
		const seconds: number = Math.round(d.getTime() / 1000);
		if (seconds > this.authenticated.expires_time) {
			return this.fetchRefreshToken().catch(e => e);
		}
		return null;
	}

	async getEndpoint(url: string) {
		return this.refreshTokenIfNeeded().then(() => {
			return fetch(url, {
				method: 'GET',
				headers: this.getBearerHeaders(this.oauthOptions.client_id, this.authenticated.access_token)
			}).then(result => result.json()).catch(e => e);
		}).catch(e => e);
	}

	private setAuthenticated(tokenOptions: TokenOptions): Authenticated {

		this.authenticated.access_token = tokenOptions.access_token;
		this.authenticated.refresh_token = tokenOptions.refresh_token;
		this.authenticated.expires_in = tokenOptions.expires_in;

		const d = new Date();
		const seconds = Math.round(d.getTime() / 1000);
		this.authenticated.expires_time = (seconds + this.authenticated.expires_in) - this.secondsOff;
		console.log('Set Expires Time', this.authenticated.expires_time);

		return this.authenticated;
	}

	private getBasicHeaders(client_id: string, client_secret: string) {
		return {
			'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
		};
	}

	private getBearerHeaders(client_id: string, access_token: string) {
		return {
			'Authorization': 'Bearer ' + access_token,
			'Client-ID': client_id,
			'Content-Type': 'application/json'
		}
	}

}

export default TwitchOAuth;