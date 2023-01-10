
const OAUTH2_BASE_URL = 'https://id.twitch.tv/oauth2';

const OAUTH2_URLS = {
    TOKEN: `${OAUTH2_BASE_URL}/token`,
    AUTHORIZE: `${OAUTH2_BASE_URL}/authorize`,
    VALIDATE: `${OAUTH2_BASE_URL}/validate`,
    REVOKE: `${OAUTH2_BASE_URL}/revoke`,
};

module.exports = {
    OAUTH2_URLS
};