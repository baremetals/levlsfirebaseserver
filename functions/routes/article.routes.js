const express = require('express')
const FBAuth = require('../utils/fbAuth')
const postHelper = require('../controllers/article.controller')

const router = express.Router()

router.route('/articles')
    .post(FBAuth.protect, postHelper.writeAnArticle)

router.route('/articles/:userId')
    .get(postHelper.getAllArticles)

router.route('/article/:articleId')
    .get(postHelper.getAnArticle)
    .delete(FBAuth.protect, postHelper.deleteArticle)
    .post(FBAuth.protect, postHelper.updateArticle)

router.route('/article/:articleId/like')
    .get(FBAuth.protect, postHelper.likeAnArticle)

router.route('/article/:articleId/unlike')
    .get(FBAuth.protect, postHelper.unLikeAnArticle)

router.route('/article/:articleId/comment')
    .post(FBAuth.protect, postHelper.commentOnArticle)

router.route('/article-comment/:commentId')
    .delete(FBAuth.protect, postHelper.deleteArticleComment)

module.exports = router;