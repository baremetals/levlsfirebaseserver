const express = require('express');
const FBAuth = require('../utils/fbAuth');
const {
  register,
  buyPlan,
  addUser,
  inviteUser,
} = require('../controllers/organisation.controller');
const router = express.Router();

router.route('/register').post(register)
router.route('/team-member').post(FBAuth.local, addUser);
router.route('/invite-user/:userId').post(FBAuth.local, inviteUser);

router.route('/purchase-plan').post(FBAuth.local, buyPlan);

module.exports = router;