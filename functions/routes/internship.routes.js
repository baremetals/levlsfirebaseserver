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

// router.route('/internship/:internshipId/review')
//     .post(FBAuth.protect, internshipHelper.reviewAnInternship)

module.exports = router;