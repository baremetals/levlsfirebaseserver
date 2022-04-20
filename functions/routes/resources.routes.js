const express = require('express')
const FBAuth = require('../utils/fbAuth')
const postHelper = require('../controllers/resources.controller')

const router = express.Router()

router.route('/resources')
    .get(postHelper.getAllResources)
    .post(FBAuth.protect, postHelper.createResource)

router.route('/resources/:userId')
    .get(postHelper.getAllOrgResources)

router.route('/resource/:slug').get(postHelper.getResource)

router
  .route('/resource/:resourceId')
  .delete(FBAuth.protect, postHelper.deleteResource)
  .post(FBAuth.protect, postHelper.updateResource)

router.route('/resource/:resourceId/like')
    .get(FBAuth.protect, postHelper.likeResource)

router.route('/resource/:resourceId/unlike')
    .get(FBAuth.protect, postHelper.unLikeResource)

router.route('/resources/:resourceId/comment')
    .post(FBAuth.protect, postHelper.commentOnResource)

router.route('/resource-comment/:commentId')
    .delete(FBAuth.protect, postHelper.deleteResourceComment)

module.exports = router;