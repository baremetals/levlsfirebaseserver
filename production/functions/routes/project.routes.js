const express = require('express')
const FBAuth = require('../utils/fbAuth')
const postHelper = require('../controllers/project.controller')

const router = express.Router()

router
  .route('/projects/:userId') // may need to relax this
  .get(postHelper.getAllProjects);

router.route('/projects')
    .post(FBAuth.protect, postHelper.createProject)

router.route('/project/:slug').get(postHelper.getProject)

router
  .route('/project/:projectId')
  .delete(FBAuth.protect, postHelper.deleteProject)
  .post(FBAuth.protect, postHelper.updateProjectDetails)

router.route('/project/:projectId/like')
    .get(FBAuth.protect, postHelper.likeProject)

router.route('/project/:projectId/unlike')
    .get(FBAuth.protect, postHelper.unLikeProject)

router.route('/projects/:projectId/comments')
    .post(FBAuth.protect, postHelper.commentOnProject)

router.route('/project-comment/:commentId')
    .delete(FBAuth.protect, postHelper.deleteProjectComment)

module.exports = router;