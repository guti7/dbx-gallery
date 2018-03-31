const crypto = require('crypto');
const config = require('./config');
const NodeCache = require('node-cache');
const reqpromise = require('request-promise');

var mycache = new NodeCache();

// Starts authentication sequence for OAuth access token if not present
// Fetches temporary links for images in dropbox folder
module.exports.home = async (req, res, next) => {
  let token = req.session.token;
  if (token) {
    try{
      let paths = await getLinksAsync(token);
      res.render('gallery', { imgs: paths, layout: false });
    } catch (error) {
      return next(new Error('Error getting images from Dropbox.'));
    }
  } else {
    res.redirect('/login');
  }
};

// Constructs the URL to perform Dropbox authentication
module.exports.login = (req, res, next) => {
  // Random state value
  let state = crypto.randomBytes(16).toString('hex');
  // Save the state and tempSession
  mycache.set(state, req.sessionID, 300);
  
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
  if (mycache.get(state) != req.sessionID) {
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
      
      await regenerateSessionAsync(req);
      req.session.token = response.access_token;
      res.redirect('/');
    } catch (error) {
      return next(new Error('Error getting access token. ' + error.message));
    }
  }
};

module.exports.logout = async (req, res, next) => {
  try {
    await destroySessionAsync(req);
    res.redirect('/login');
  } catch(error) {
    return next(new Error('Error logging out: /logout. ' + error.message));
  }
};

/*
* Returns a promise that fulfills when a session is destroyed
*/
function destroySessionAsync(req) {

  return new Promise(async (resolve, reject) => {

    try {
      // Revoke token in dropbox.com
      let options = {
        url: config.DBX_API_DOMAIN + config.DBX_TOKEN_REVOKE_PATH,
        headers: {'Authorization': 'Bearer ' + req.session.token},
        method: 'POST'
      }

      let result = await reqpromise(options);
    } catch(eror) {
      reject(new Error('Error destroying token - destroySessionAsync.'));
    }

    // Destroy session
    req.session.destroy( (err) => {
      err ? reject(err) : resolve();
    });
  });
}

/*
* Returns a promise that fulfills when a new session is created
*/
function regenerateSessionAsync(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) =>{
      err ? reject(err) : resolve();
    });
  });
}

/*
* Gets temporary links for a set of files in the root folder of the app
* Two step process:
* 1. Get a list of all the paths of the files.
* 2. Fetch a temporary link for each file.
*/
async function getLinksAsync(token) {
  // List images from the root of the app folder
  let result = await listImagePathsAsync(token, '');

  // Get a temporary link for each of the paths returned
  let temporaryLinkResults = await getTemporaryLinksForPathsAsync(token, result.paths);

  // Construct a new array only with the link field
  var temporaryLinks = temporaryLinkResults.map(function (entry) {
    return entry.link;
  });

  return temporaryLinks;
}

/*
* Returns an object containing an array with the path_lower of each
* image file and if more files a cursor to continue
*/
async function listImagePathsAsync(token, path) {
  let options = {
    url: config.DBX_API_DOMAIN + config.DBX_LIST_FOLDER_PATH,
    headers: {'Authorization': 'Bearer ' + token},
    method: 'POST',
    json: true,
    body: {'path': path}
  }

  try {
    // Make request to Dropbox to get list of files
    let result = await reqpromise(options);

    // Filter response to images only
    let entriesFiltered = result.entries.filter(function (entry) {
      return entry.path_lower.search(/\.(gif|jpg|jpeg|tiff|png)$/i) > -1;
    });

    // Get an array from the entries with only the path_lower fields
    var paths = entriesFiltered.map(function (entry) {
      return entry.path_lower;
    });

    // Return a cursor only if there are more files in the current folder
    let response = {};
    response.paths = paths;
    if (result.hasmore) {
      response.cursor = result.cursor;
    }

    return response;

  } catch (error) {
    return next(new Error('Error listing folder. ' + error.message));
  }
}

// Returns an array with temporary links from an array with file paths
function getTemporaryLinksForPathsAsync(token, paths) {
  var promises = [];
  let options = {
    url: config.DBX_API_DOMAIN + config.DBX_GET_TEMP_LINK_PATH,
    headers: {'Authorization': 'Bearer ' + token},
    method: 'POST',
    json: true
  }

  // Create a promise for each path and push it to an array of promises
  paths.forEach( (path_lower) => {
    options.body = {'path': path_lower};
    promises.push(reqpromise(options));
  });

  // Returns a promise that fulfills once all the promises in the array
  // complete or one fails
  return Promise.all(promises);
}