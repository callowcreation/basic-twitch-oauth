/*!
 * basic-twitch-oauth
 * Copyright(c) 2019-present caLLowCreation
 * MIT Licensed
 */

'use strict';

const fetch = require('node-fetch');
const { OAUTH2_URLS } = require('../constants');

const SECONDS_OFF = 60;

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

async function toResult(res) {
    const contentType = res.headers.get('content-type');
    return contentType && contentType.includes('application/json') ? res.json() : res.text();
}

function TwitchAppAccess({ client_id, client_secret }) {
    this.client_id = client_id;
    this.client_secret = client_secret;

    this.authenticated = {
        access_token: null,
        token_type: null,
        expires_in: 0,
        expires_time: 0
    };
}

TwitchAppAccess.prototype.makeAuthenticated = function ({ access_token, token_type, expires_in }) {
    const d = new Date();
    const ms = d.getTime();
    return {
        access_token: access_token,
        token_type: token_type,
        expires_in: expires_in,
        expires_time: (ms + (expires_in * 1000)) - (SECONDS_OFF * 1000),
        last_validated: ms
    };
};

TwitchAppAccess.prototype.setAuthenticated = function ({ access_token, token_type, expires_in }) {
    this.authenticated = this.makeAuthenticated({ access_token, token_type, expires_in });
    return access_token;
};

TwitchAppAccess.prototype.token = async function () {
    const url = `${OAUTH2_URLS.TOKEN}?client_id=${this.client_id}&client_secret=${this.client_secret}&grant_type=client_credentials`;
    const options = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST'
    };
    return fetch(url, options).then(checkStatus).then(toResult).then(json => this.setAuthenticated(json));
};

/**
 * 
 * @param url Fully qualified URL.
 * 
 * @throws When request fails
 * 
 */
TwitchAppAccess.prototype.getEndpoint = async function (url) {
    const headers = getBearerHeaders(this.client_id, this.authenticated.access_token);
    const options = {
        headers,
        method: 'GET',
    };
    return fetch(url, options).then(checkStatus).then(toResult);
};

module.exports = TwitchAppAccess;