const express = require('express')
const FBAuth = require('../utils/fbAuth')
const apprenticeHelper = require('../controllers/apprentice.controller')

const router = express.Router()

router.route('/apprenticeships')
    .post(FBAuth.protect, apprenticeHelper.createAnApprenticeship)

router.route('/apprenticeships/:userId')
    .get(apprenticeHelper.getAllApprenticeships)

router.route('/apprenticeship/:slug').get(apprenticeHelper.getAnApprenticeship);

router
  .route('/apprenticeship/:apprenticeshipId')
  .delete(FBAuth.protect, apprenticeHelper.deleteAnApprenticeship)
  .post(FBAuth.protect, apprenticeHelper.updateAnApprenticeship);

// router.route('/apprentice-applications/:apprenticeshipId')
//     .post(FBAuth.protect, apprenticeHelper.submitApprenticeApplication)

router.route('/apprentice-cv/:apprenticeshipId')
    .post(FBAuth.protect, apprenticeHelper.submitApprenticeCVApplication)

// router.route('/apprenticeship/:apprenticeshipId/review')
//     .post(FBAuth.protect, apprenticeHelper.reviewAnApprenticeship)

module.exports = router;