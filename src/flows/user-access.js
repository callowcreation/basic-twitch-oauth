/*!
 * basic-twitch-oauth
 * Copyright(c) 2019-present caLLowCreation
 * MIT Licensed
 */

'use strict';

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const { OAUTH2_URLS } = require('../constants');

const SECONDS_OFF = 60;

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
    };
}

/**
 * 
 * @param {response} res the response from the fetch request
 * 
 * @throws When request fails (res.status >= 200 && res.status < 300 acceptable status)
 */
async function checkStatus(res) {
    if (!res.ok) throw new Error(res.statusText);
    return res; // res.status >= 200 && res.status < 300
}

/**
 * 
 * @param {response} res the response from the fetch request
 * @returns true if response status is 200
 */
function statusOk(res) {
    return res.status === 200;
}

async function toResult(res) {
    const contentType = res.headers.get('content-type');
    return contentType && contentType.includes('application/json') ? res.json() : res.text();
}

function UserAccess({ client_id, client_secret, redirect_uri, scopes }, state) {
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

    this.authorizeUrl = `${OAUTH2_URLS.AUTHORIZE}?${urlQuery}`;
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
UserAccess.prototype.confirmState = function (state) {
    if (state !== this.state) throw new Error(`Authorization failed ${state} mismatch`);
};

UserAccess.prototype.makeAuthenticated = function ({ access_token, refresh_token, expires_in }) {
    const d = new Date();
    const ms = d.getTime();
    return {
        access_token: access_token,
        refresh_token: refresh_token,
        expires_in: expires_in,
        expires_time: (ms + (expires_in * 1000)) - (SECONDS_OFF * 1000),
        last_validated: ms
    };
};

UserAccess.prototype.setAuthenticated = function ({ access_token, refresh_token, expires_in }) {
    this.authenticated = this.makeAuthenticated({ access_token, refresh_token, expires_in });
    return access_token;
};
/**
 * @class
 * @alias module:UserAccess
 * @param code The OAuth 2.0 authorization code is a 30-character, 
 * randomly generated string.  It is used to make a request to the 
 * token endpoint in exchange for an access token.
 * 
 * @throws When request fails
 * 
 */
UserAccess.prototype.fetchToken = async function (code) {
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

UserAccess.prototype.fetchRefreshToken = async function () {
    return this.fetchRefreshTokenWithCredentials(this.client_id, this.client_secret, this.authenticated.refresh_token).then(json => this.setAuthenticated(json));
};

/**
 * 
 * Does not store credentials
 * 
 */
UserAccess.prototype.fetchRefreshTokenWithCredentials = async function (client_id, client_secret, refresh_token) {
    return fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: getBasicHeaders(client_id, client_secret),
        body: new URLSearchParams({
            client_id: client_id,
            client_secret: client_secret,
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        })
    }).then(checkStatus).then(toResult);
};

UserAccess.prototype.refreshTokenIfNeeded = async function () {

    if (this.refreshTokenNeeded(this.authenticated)) {
        return this.fetchRefreshToken();
    }

    return this.authenticated.access_token;
};

UserAccess.prototype.refreshTokenNeeded = function (authenticated) {
    const d = new Date();
    const time = d.getTime();
    return time > authenticated.expires_time;
};

UserAccess.prototype.fetchEndpoint = async function (url, options) {
    return this.refreshTokenIfNeeded().then(access_token => this.fetchEndpointWithCredentials(this.client_id, access_token, url, options));
};

UserAccess.prototype.fetchEndpointWithCredentials = async function (client_id, access_token, url, options) {
    options.headers = getBearerHeaders(client_id, access_token);
    return fetch(url, options).then(checkStatus).then(toResult);
};

/**
 * @deprecated since version 1.0.14 use {@link validateToken} or {@link validate} instead
 * @param {string} client_id an application client id
 * @param {string} access_token access token for the given client id
 * 
 */
UserAccess.prototype.validateWithCredentials = async function (client_id, access_token) {
    const options = {
        method: 'GET',
        headers: getBearerHeaders(client_id, access_token),
    };
    return fetch(OAUTH2_URLS.VALIDATE, options).then(checkStatus).then(toResult);
};

/**
 * 
 * @param {string} access_token access token for the given client id
 * 
 */
UserAccess.prototype.validateToken = async function (access_token) {
    const options = {
        headers: {
            'Authorization': `OAuth ${access_token}`
        },
        method: 'GET'
    };
    return fetch(OAUTH2_URLS.VALIDATE, options).then(statusOk);
};

/**
 * 
 * @param {string} client_id an application client id
 * @param {string} access_token access token for the given client id
 * 
 */
UserAccess.prototype.revokeToken = async function (client_id, access_token) {
    const url = `${OAUTH2_URLS.REVOKE}?client_id=${client_id}&token=${access_token}`;
    const options = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST'
    };
    return fetch(url, options).then(statusOk);
}

/**
 * 
 * Validate the current access token
 * 
 */
UserAccess.prototype.validate = async function () {
    return this.validateToken(this.authenticated.access_token);
};

/**
 * 
 * Revoke the current access token
 * 
 */
UserAccess.prototype.revoke = async function () {
    return this.revokeToken(this.client_id, this.authenticated.access_token);
}

/**
 * 
 * @param url Fully qualified URL.
 * 
 * @throws When request fails
 * 
 */
UserAccess.prototype.getEndpoint = async function (url) {
    return this.fetchEndpoint(url, {
        method: 'GET'
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
UserAccess.prototype.postEndpoint = async function (url, body) {
    return this.fetchEndpoint(url, {
        method: 'POST',
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
UserAccess.prototype.putEndpoint = async function (url, body) {
    return this.fetchEndpoint(url, {
        method: 'PUT',
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
UserAccess.prototype.patchEndpoint = async function (url, body) {
    return this.fetchEndpoint(url, {
        method: 'PATCH',
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
UserAccess.prototype.deleteEndpoint = async function (url) {
    return this.fetchEndpoint(url, {
        method: 'DELETE'
    });
};

UserAccess.prototype.getAuthenticated = function () {
    return this.authenticated;
};

module.exports = UserAccess;