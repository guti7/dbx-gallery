var express = require('express');
var router = express.Router();
var controller = require('../controller');

/* GET home page. */
router.get('/', controller.home);

/* GET login page */
router.get('/login', controller.login);

/* GET oauth redirect */
router.get('/oauthredirect', controller.oauthredirect);

/* GET logout */
router.get('/logout', controller.logout);

module.exports = router;