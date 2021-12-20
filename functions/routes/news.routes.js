const express = require('express')
const FBAuth = require('../utils/fbAuth')
const postHelper = require('../controllers/news.controller')

const router = express.Router()

router.route('/newsposts')
    .get(postHelper.getAllPosts)
    .post(FBAuth.protect, postHelper.createPost)

router.route('/newsposts/:userId')
    .get(postHelper.getAllOrgPosts)

router.route('/newspost/:newsId')
    .get(postHelper.getPost)
    .delete(FBAuth.protect, postHelper.deletePost)
    .post(FBAuth.protect, postHelper.updatePost)

router.route('/newspost/:newsId/like')
    .get(FBAuth.protect, postHelper.likePost)

router.route('/newspost/:newsId/unlike')
    .get(FBAuth.protect, postHelper.unLikePost)

router.route('/newspost/:newsId/comment')
    .post(FBAuth.protect, postHelper.commentOnPost)

router.route('/news-comment/:commentId')
    .delete(FBAuth.protect, postHelper.deleteNewsComment)

module.exports = router;