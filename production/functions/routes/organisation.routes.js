const express = require('express');
const FBAuth = require('../utils/fbAuth');
const { register } = require('../controllers/organisation.controller');
const router = express.Router();

router.route('/register').post(register);

module.exports = router;
