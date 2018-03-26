require('dotenv').config(silent: true});

module.exports = {
  DBX_API_DOMAIN:     'https://api.dropboxapi.com',
  DBX_OAUTH_DOMAIN:   'https://www.dropbox.com',
  DBX_OAUTH_PATH:     '/oauth2/authorize',
  DBX_TOKEN_PATH:     '/oauth2/token',
  DBX_APP_KEY:        process.env.DBX_APP_KEY,
  DBX_APP_SECRET:     process.env.DBX_APP_SECRET,
  OAUTH_REDIRECT_URL: process.env.OAUTH_REDIRECT_URL,
}