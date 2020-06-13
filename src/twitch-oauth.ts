/*!
 * basic-twitch-oauth
 * Copyright(c) 2019-present caLLowCreation
 * Modified by Kayne "Ratstail91" Ruse
 * MIT Licensed
 */

import fetch, { Response } from 'node-fetch';

//types
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

//global constants
const DOMAIN: string = 'https://id.twitch.tv/oauth2';
const SECONDS_OFF: number = 60;

const EMPTY_AUTHENTICATED: Authenticated = {
	access_token: '',
	refresh_token: '',
	expires_in: 0,
	expires_time: 0
};

//the class we're building
class TwitchOAuth {
	//members
	private oauthOptions: TwitchOAuthOptions;
	private state: string;

	private authenticated: Authenticated = EMPTY_AUTHENTICATED;

	//methods
	constructor(oauthOptions: TwitchOAuthOptions, state: string) {
		this.oauthOptions = oauthOptions;
		this.state = state;
	}

	//initial connection to twitch (pass this to the "open" library so the user can auth the app)
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

	//next step in twitch integration
	//"code" should be retreived from the redirect
	async fetchToken(code: string): Promise<void> {
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
			.then(this.checkStatus)
			.then(this.toJson)
			.then(this.setAuthenticated.bind(this))
		;
	}

	//refresh the token
	async fetchRefreshToken(): Promise<void> {
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
			.then(this.checkStatus)
			.then(this.toJson)
			.then(this.setAuthenticated.bind(this))
		;
	}

	//only refreshes if needed...
	private async refreshTokenIfNeeded(): Promise<void> {
		const date: Date = new Date();
		const seconds: number = Math.round(date.getTime() / 1000);
		if (seconds > this.authenticated.expires_time) {
			this.authenticated = EMPTY_AUTHENTICATED;
			await this.fetchRefreshToken();
		}
	}

	//fetch a specific endpoint
	private fetchEndpoint(url: string): Promise<TokenOptions> {
		return fetch(url, {
			method: 'GET',
			headers: this.getBasicHeaders(this.oauthOptions.client_id, this.authenticated.access_token)
		})
			.then(this.checkStatus)
			.then(this.toJson)
		;
	}

	//this seems to be the key function for intereacting with twitch as a whole
	async getEndpoint(url: string): Promise<any> {
		await this.refreshTokenIfNeeded();
		return this.fetchEndpoint(url);
	}

	//authentication utilities
	private toJson(res: Response): Promise<TokenOptions> {
		return res.json();
	}

	private setAuthenticated(tokenOptions: TokenOptions): void {
		this.authenticated.access_token = tokenOptions.access_token;
		this.authenticated.refresh_token = tokenOptions.refresh_token;
		this.authenticated.expires_in = tokenOptions.expires_in;

		const date: Date = new Date();
		const seconds = Math.round(date.getTime() / 1000);
		this.authenticated.expires_time = (seconds + this.authenticated.expires_in) - SECONDS_OFF;
		console.log('Set Expires Time', this.authenticated.expires_time, '(', this.authenticated.expires_in, ')');
	}

	//confirmation helpers
	get isAuthenticated(): boolean {
		return this.authenticated.refresh_token !== '';
	}

	confirmState(state: string): void {
		if (state !== this.state) {
			throw new Error('The response includes the state parameter error');
		}
	}

	private checkStatus(res: Response): Response {
		if (res.ok) { // res.status >= 200 && res.status < 300
			return res;
		} else {
			throw new Error(res.statusText);
		}
	}

	//header helpers
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
		};
	}

	//scoprs helper
	private get scopes(): string {
		return this.oauthOptions.scopes.join(' ');
	}

}

export default TwitchOAuth;