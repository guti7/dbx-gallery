const crypto = require('crypto');
const config = require('./config');
const NodeCache = require('node-cache');
var mycache = new NodeCache();
var reqpromise = require('request-promise');

// Starts authentication sequence for OAuth access token if not present
module.exports.home = (req, res, next) => {
  let token = mycache.get('aTempTokenKey');
  if (token) {
    var paths = ['images/sample-1.jpg', 'images/sample-2.jpg', 'images/sample-3.jpg'];
    
    res.render('gallery', { imgs: paths, layout: false });
  } else {
    res.redirect('/login');
  }
};

// Constructs the URL to perform Dropbox authentication
module.exports.login = (req, res, next) => {
  // Random state value
  let state = crypto.randomBytes(16).toString('hex');
  // Save the state and tempSession
  mycache.set(state, 'aTempSessionValue', 300);
  
  // URL includes the redirect after authentication is succesful
  let dbxRedirect = config.DBX_OAUTH_DOMAIN +
                    config.DBX_OAUTH_PATH + 
                    "?response_type=code&client_id=" +
                    config.DBX_APP_KEY +
                    "&redirect_uri=" +
                    config.OAUTH_REDIRECT_URL +
                    "&state=" +
                    state;
                    
  res.redirect(dbxRedirect);
};

// Get access token after authorization code is obtained
// upon success there is a redirect to home '/'
// Prevents server blocking with async await
module.exports.oauthredirect = async (req, res, next) => {
  
  // Check for error on the response
  if (req.query.error_description) {
    return next(new Error(req.querry.error_description));
  }
  
  // Validate response state with cached state
  let state = req.query.state;
  if (!mycache.get(state)) {
    return next(new Error("Session expired or invalid state"));
  }
  
  // Use authorization code to obtain access token
  if (req.query.code) {
    let options = {
      url: config.DBX_API_DOMAIN + config.DBX_TOKEN_PATH, 
      // query string
      qs: {
        'code':          req.query.code,
        'grant_type':    'authorization_code',
        'client_id':     config.DBX_APP_KEY,
        'client_secret': config.DBX_APP_SECRET,
        'redirect_uri':  config.OAUTH_REDIRECT_URL
      },
      method: 'POST',
      json: true
    }
    
    try {
      // Yields until the call has a returned value (or error)
      let response = await reqpromise(options); 
      
      // Momentary TODO: Replace cache with proper storage
      mycache.set('aTempTokenKey', response. access_token, 3600);
      res.redirect('/');
    } catch (error) {
      return next(new Error('Error getting access tokan. ' + error.message))
    }
  }
};