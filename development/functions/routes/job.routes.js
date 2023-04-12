const express = require('express');
const FBAuth = require('../utils/fbAuth');
const jobHelper = require('../controllers/job.controller');

const router = express.Router();

router
  .route('/jobs')
  .post(FBAuth.protect, jobHelper.createAJob);

router
  .route('/jobs/:userId')
  .get(jobHelper.getAllJobs);

router.route('/job/:slug').get(jobHelper.getAJob);

router
  .route('/job/:jobId')
  .delete(FBAuth.protect, jobHelper.deleteAJob)
  .post(FBAuth.protect, jobHelper.updateAJob);

router
  .route('/job-applicant/:id')
  .get(FBAuth.protectOrgData, jobHelper.getAllApplicantSubmissions)
  .post(FBAuth.protect, jobHelper.submitApplication);

router
  .route('/job-submission/:jobId/:userId')
  .get(FBAuth.protectOrgData, jobHelper.getApplicantSubmission);

router
  .route('/job-shortlist/:jobId')
  .get(FBAuth.protectOrgData, jobHelper.getJobShortList)
  .post(FBAuth.protectOrgData, jobHelper.addApplicantToShortList);

router
  .route('/job-interviewlist/:jobId')
  .get(FBAuth.protectOrgData, jobHelper.getJobInterviewList)
  .post(FBAuth.protectOrgData, jobHelper.addApplicantToInterviewList);

router
  .route('/job-shortlist/:jobId/:userId')
  .delete(FBAuth.protectOrgData, jobHelper.removeShortListedApplicant);

router
  .route('/job-interviewlist/:jobId/:userId')
  .delete(FBAuth.protectOrgData, jobHelper.removeApplicantFromList);

module.exports = router;
