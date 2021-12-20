const express = require('express')
const FBAuth = require('../utils/fbAuth')
const grantHelper = require('../controllers/grant.controller')

const router = express.Router()

router.route('/grants')
    .post(grantHelper.createAGrant)

router.route('/grants/:userId')
    .get(grantHelper.getAllGrants)

router.route('/grant/:grantId')
    .get(grantHelper.getAGrant)
    .delete(FBAuth.protect, grantHelper.deleteAGrant)
    .post(FBAuth.protect, grantHelper.updateAGrant)

router.route('/grant-applications/:grantId')
    .post(FBAuth.protect, grantHelper.submitGrantApplication)

router.route('/grant-cv/:grantId')
    .post(FBAuth.protect, grantHelper.submitGrantCVApplication)


// router.route('/grant/:grantId/review')
//     .post(FBAuth.protect, grantHelper.reviewAGrant)

module.exports = router;