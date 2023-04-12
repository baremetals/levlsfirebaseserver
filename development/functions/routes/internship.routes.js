const express = require('express')
const FBAuth = require('../utils/fbAuth')
const internshipHelper = require('../controllers/internship.controller')

const router = express.Router()

router.route('/internships')
    .post(FBAuth.protect, internshipHelper.createAnInternship)

router.route('/internships/:userId')
    .get(internshipHelper.getAllInternships)

router.route('/internship/:slug').get(internshipHelper.getAnInternship);

router
  .route('/internship/:internshipId')
  .delete(FBAuth.protect, internshipHelper.deleteAnInternship)
  .post(FBAuth.protect, internshipHelper.updateAnInternship);

// router.route('/intern-applications/:internshipId')
//     .post(FBAuth.protect, internshipHelper.submitInternApplication)

router.route('/intern-cv/:internshipId')
    .post(FBAuth.protect, internshipHelper.submitInternCVApplication)

router
  .route('/intern-applicant/:id')
  .get(FBAuth.protectOrgData, internshipHelper.getAllInternSubmissions)
  .post(FBAuth.protect, internshipHelper.submitInternApplication);

router
  .route('/intern-submission/:internshipId/:userId')
  .get(FBAuth.protectOrgData, internshipHelper.getOneInternSubmission);

router
  .route('/intern-shortlist/:internshipId')
  .get(
    FBAuth.protectOrgData,
    internshipHelper.getAllShortListedInternCandidates
  )
  .post(FBAuth.protectOrgData, internshipHelper.addInternCandidateToShortList);

router
  .route('/intern-interviewlist/:internshipId')
  .get(FBAuth.protectOrgData, internshipHelper.getInternInterviewList)
  .post(
    FBAuth.protectOrgData,
    internshipHelper.addInternCandidateToInterviewList
  );

router
  .route('/intern-shortlist/:internshipId/:userId')
  .delete(
    FBAuth.protectOrgData,
    internshipHelper.removeShortListedInternCandidate
  );

router
  .route('/intern-interviewlist/:internshipId/:userId')
  .delete(FBAuth.protectOrgData, internshipHelper.removeInternFromInterviewList);

module.exports = router;