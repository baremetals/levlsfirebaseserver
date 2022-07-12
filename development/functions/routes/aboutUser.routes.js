const express = require('express')
const aboutHelper = require('../controllers/aboutUser.controller')
const FBAuth = require('../utils/fbAuth');

const router = express.Router()

router.route('/user-experience/')
  .post(FBAuth.protect, aboutHelper.addExperience)

router.route('/user-experience/:experienceId')
  .post(FBAuth.protect, aboutHelper.updateExperience)
  .delete(FBAuth.protect, aboutHelper.deleteExperience)

router.route('/user-educations/')
  .post(FBAuth.protect, aboutHelper.addEducation)

router.route('/user-education/:educationId')
  .post(FBAuth.protect, aboutHelper.updateEducation)
  .delete(FBAuth.protect, aboutHelper.deleteEducation)

router.route('/user-skills/')
  .post(FBAuth.protect, aboutHelper.addSkills)

router.route('/user-skill/:skillId')
  .post(FBAuth.protect, aboutHelper.updateSkills)
  .delete(FBAuth.protect, aboutHelper.deleteSkills)

router.route('/user-interests/')
  .post(FBAuth.protect, aboutHelper.addInterests)

router
  .route('/user-preferred-industries/')
  .post(FBAuth.protect, aboutHelper.addPreferredIndustries);

router.route('/user-interest/:interestId')
  .delete(FBAuth.protect, aboutHelper.deleteInterest)
  .post(FBAuth.protect, aboutHelper.updateInterest)

module.exports = router;