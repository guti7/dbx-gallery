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