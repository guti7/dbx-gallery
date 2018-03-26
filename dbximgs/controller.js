const crypto = require('crypto');
const config = require('./config');
const NodeCache = require('node-cache');
var mycache = new NodeCache();

module.exports.home = (req, res, next) => {
  let token = mycache.get('aTempTokenKey');
  if (token) {
    var paths = ['images/sample-1.jpg', 'images/sample-2.jpg', 'images/sample-3.jpg'];
    
    res.render('gallery', { imgs: paths, layout: false });
  } else {
    res.redirect('/login');
  }
};

module.exports.login = (req, res, next) => {
  // Random state value
  let state = crypto.randomBytes(16).toString('hex');
  // Save the state and tempSession
  mycache.set(state, 'aTempSessionValue', 300);
  
  let dbxRedirect = config.DBX_OAUTH_DOMAIN +
                    config.DBX_OAUTH_PATH + 
                    "?response_type=code&client_id=" +
                    config.DBX_APP_KEY +
                    "&redirect_uri=" +
                    config.OAUTH_REDIRECT_URL +
                    "&state=" +
                    state;
                    
  res.redirect(dbxRedirect);
}