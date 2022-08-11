const express = require('express')
const FBAuth = require('../utils/fbAuth')
const apprenticeHelper = require('../controllers/apprentice.controller')

const router = express.Router()

router
  .route('/apprenticeships')
  .post(FBAuth.protectOrgData, apprenticeHelper.createAnApprenticeship);

router.route('/apprenticeships/:userId')
    .get(apprenticeHelper.getAllApprenticeships)

router.route('/apprenticeship/:slug').get(apprenticeHelper.getAnApprenticeship);

router
  .route('/apprenticeship/:apprenticeshipId')
  .delete(FBAuth.protectOrgData, apprenticeHelper.deleteAnApprenticeship)
  .post(FBAuth.protectOrgData, apprenticeHelper.updateAnApprenticeship);

// router.route('/apprentice-applications/:apprenticeshipId')
//     .post(FBAuth.protect, apprenticeHelper.submitApprenticeApplication)

router.route('/apprentice-cv/:apprenticeshipId')
    .post(FBAuth.protect, apprenticeHelper.submitApprenticeCVApplication)

router
  .route('/apprentice-applicant/:id')
  .get(FBAuth.protectOrgData, apprenticeHelper.getAllApprenticeshipSubmissions)
  .post(FBAuth.protect, apprenticeHelper.submitApprenticeApplication);

router
  .route('/apprentice-submission/:apprenticeshipId/:userId')
  .get(FBAuth.protectOrgData, apprenticeHelper.getOneApprenticeSubmission);

router
  .route('/apprentice-shortlist/:apprenticeshipId')
  .get(FBAuth.protectOrgData, apprenticeHelper.getAllShortListedCandidates)
  .post(FBAuth.protectOrgData, apprenticeHelper.addCandidateToShortList);

router
  .route('/apprentice-interviewlist/:apprenticeshipId')
  .get(FBAuth.protectOrgData, apprenticeHelper.getInterviewList)
  .post(FBAuth.protectOrgData, apprenticeHelper.addCandidateToInterviewList);

  router
    .route('/apprentice-shortlist/:apprenticeshipId/:userId')
    .delete(FBAuth.protectOrgData, apprenticeHelper.removeShortListedCandidate);

router
  .route('/apprentice-interviewlist/:apprenticeshipId/:userId')
  .delete(FBAuth.protectOrgData, apprenticeHelper.removeFromInterviewList);
// router.route('/apprenticeship/:apprenticeshipId/review')
//     .post(FBAuth.protect, apprenticeHelper.reviewAnApprenticeship)

module.exports = router;