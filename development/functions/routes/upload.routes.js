const express = require('express')
const uploadHelper = require('../controllers/upload.controller')
const FBAuth = require('../utils/fbAuth');

const router = express.Router()

router.route('/user-upload')
  .post(FBAuth.protect, uploadHelper.userUploads);

router
  .route('/user-upload/:uploadId')
  .get(uploadHelper.getAnUpload)
  .post(FBAuth.protect, uploadHelper.updateUploadDetails)
  .delete(FBAuth.protect, uploadHelper.deleteUpload);

router.route('/user-upload/:uploadId/comments')
  .post(FBAuth.protect, uploadHelper.commentOnAnUpload)

router.route('/upload-comment/:commentId')
  .delete(FBAuth.protect, uploadHelper.deleteUploadComment)

router.route('/user-upload/:uploadId/like')
  .get(FBAuth.protect, uploadHelper.likeAnUpload)

router.route('/user-upload/:uploadId/unlike')
  .get(FBAuth.protect, uploadHelper.unLikeAnUpload)

router.route('/upload-meta')
  .post(FBAuth.protect, uploadHelper.uploadMetaData)

router
  .route('/user-audio-upload')
  .post(uploadHelper.addNewAudioFile);


module.exports = router;