
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

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

TwitchOAuth.prototype.getBasicHeaders = function () {
    return {
        'Authorization': 'Basic ' + (Buffer.from(this.client_id + ':' + this.client_secret).toString('base64'))
    };
};

TwitchOAuth.prototype.getBearerHeaders = function () {
    return {
        'Authorization': 'Bearer ' + this.authenticated.access_token,
        'Content-Type': 'application/json'
    }
};

TwitchOAuth.prototype.confirmState = function (state) {
    return state === this.state;
};

TwitchOAuth.prototype.setAuthenticated = function ({ access_token, refresh_token, expires_in }) {
    this.authenticated.access_token = access_token;
    this.authenticated.refresh_token = refresh_token;
    this.authenticated.expires_in = expires_in;

    this.setTokenExpiersTime();
};

TwitchOAuth.prototype.setTokenExpiersTime = function () {
    const d = new Date();
    const seconds = Math.round(d.getTime() / 1000);
    this.authenticated.expires_time = (seconds + this.authenticated.expires_in) - this.secondsOff;
    console.log('Set Expires Time', this.authenticated.expires_time);
};

TwitchOAuth.prototype.fetchRefreshToken = function () {
    return fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: this.getBasicHeaders(),
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.authenticated.refresh_token,
            client_id: this.client_id,
            client_secret: this.client_secret,
        })
    }).then(result => result.json()).catch(e => console.error(e));
};

TwitchOAuth.prototype.fetchToken = async function (code) {
    return fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: this.getBasicHeaders(),
        body: new URLSearchParams({
            client_id: this.client_id,
            client_secret: this.client_secret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: this.redirect_uri
        })
    }).then(result => result.json()).catch(e => console.error(e));
};

TwitchOAuth.prototype.refreshTokenIfNeeded = function () {
    const d = new Date();
    const seconds = Math.round(d.getTime() / 1000);

    if (seconds > this.authenticated.expires_time) {
        return this.fetchRefreshToken().then(json => {
            this.authenticated.access_token = json.access_token;
            this.authenticated.refresh_token = json.refresh_token;
            this.authenticated.expires_in = json.expires_in;

            this.setTokenExpiersTime();
        }).catch(e => console.error(e));
    }
    return Promise.resolve();
};

TwitchOAuth.prototype.getEndpoint = async function (url) {
    return this.refreshTokenIfNeeded().then(() => {
        return fetch(url, {
            method: 'GET',
            headers: this.getBearerHeaders()
        }).then(result => result.json()).catch(e => console.error(e));
    }).catch(e => console.error(e));
};

module.exports = TwitchOAuth;