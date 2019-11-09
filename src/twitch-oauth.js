
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

function TwitchOAuth({ client_id, client_secret, redirect_uri, scopes }) {

    this.client_id = client_id;
    this.client_secret = client_secret;
    this.redirect_uri = redirect_uri;
    this.scopes = scopes.join(' ');

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
        `state=myRANDstate4daBADIES`
    ];
    const urlQuery = urlParams.join('&');

    this.authorizeUrl = `https://id.twitch.tv/oauth2/authorize?${urlQuery}`
}

TwitchOAuth.prototype.setAuthenticated = function ({ access_token, refresh_token, expires_in }) {
    this.authenticated.access_token = access_token;
    this.authenticated.refresh_token = refresh_token;
    this.authenticated.expires_in = expires_in;
};

TwitchOAuth.prototype.fetchToken = async function (code) {
    return fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + (Buffer.from(this.client_id + ':' + this.client_secret).toString('base64'))
        },
        body: new URLSearchParams({
            client_id: this.client_id,
            client_secret: this.client_secret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: this.redirect_uri
        })
    }).then(result => result.json()).catch(e => console.error(e));
}

TwitchOAuth.prototype.getEndpoint = async function(url) {
    return fetch(url, {
        method: 'GET',
        headers: getBearerHeaders(access_token)
    });
}

function getBearerHeaders(access_token) {
    return {
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
    }
}

module.exports = TwitchOAuth;