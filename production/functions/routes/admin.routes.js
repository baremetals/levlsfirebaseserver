const express = require('express')
const FBAuth = require('../utils/fbAuth');
const {
  getAdminUser,
  getUsers,
  getOrganisations,
  adminGetAllGrants,
  adminGetAllInternships,
  adminGetAllApprenticeships,
  adminCreateAnApprenticeship,
  adminActivateOrDisableApprenticeship,
  adminCreateAGrant,
  adminCreateAnInternship,
  adminCreateResource,
  adminCreateEvent,
  adminCreateNewsPost,
  adminLogin,
  adminEditUserDetails,
  adminEditOrganisationDetails,
  contactUs,
} = require('../controllers/admin.controller');

const router = express.Router()

router.route('/contact-us')
  .post(contactUs)

// Admins
router.route('/admin/login')
  .post(adminLogin)


router.route('/admin/user')
  .get(FBAuth.restrictToAdmin, getAdminUser);

// Users

router.route('/admin/users/:call').get(FBAuth.restrictToAdmin, getUsers);
router
  .route('/admin/organisations/:call')
  .get(FBAuth.restrictToAdmin, getOrganisations);
  
router
  .route('/admin/user/edit-user')
  .post(FBAuth.restrictToAdmin, adminEditUserDetails);

router
  .route('/admin/user/edit-organisation')
  .post(FBAuth.protect, adminEditOrganisationDetails);

// Apprenticeships
router
  .route('/admin/apprenticeships')
  .get(FBAuth.restrictToAdmin, adminGetAllApprenticeships)
  .post(FBAuth.restrictToAdmin, adminCreateAnApprenticeship);

router
  .route('/admin/apprenticeships/:apprenticeshipId')
  .post(FBAuth.restrictToAdmin, adminActivateOrDisableApprenticeship);


// Grants
router
  .route('/admin/grants')
  .get(FBAuth.restrictToAdmin, adminGetAllGrants)
  .post(FBAuth.restrictToAdmin, adminCreateAGrant);

// Internships
router
  .route('/admin/internships')
  .get(FBAuth.restrictToAdmin, adminGetAllInternships)
  .post(FBAuth.restrictToAdmin, adminCreateAnInternship);

// Resources
router
  .route('/admin/resources')
  .post(FBAuth.restrictToAdmin, adminCreateResource);


// Events
router.route('/admin/events').post(FBAuth.restrictToAdmin, adminCreateEvent);

// News Articles
router
  .route('/admin/newsposts')
  .post(FBAuth.restrictToAdmin, adminCreateNewsPost);



module.exports = router;