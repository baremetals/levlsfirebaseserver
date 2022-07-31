const express = require('express');
const FBAuth = require('../utils/fbAuth');
const jobHelper = require('../controllers/job.controller');

const router = express.Router();

router.route('/jobs').post(FBAuth.protect, jobHelper.createAJob);

router.route('/jobs/:userId').get(jobHelper.getAllJobs);

router.route('/job/:slug').get(jobHelper.getAJob);

router
  .route('/job/:jobId')
  .delete(FBAuth.protect, jobHelper.deleteAJob)
  .post(FBAuth.protect, jobHelper.updateAJob);

// router.route('/job-applications/:jobId')
//     .post(FBAuth.protect, jobHelper.submitJobApplication)

router
  .route('/job-cv/:jobId')
  .post(FBAuth.protect, jobHelper.submitJobCVApplication);

// router.route('/job/:jobId/review')
//     .post(FBAuth.protect, jobHelper.reviewAnJobship)

module.exports = router;
