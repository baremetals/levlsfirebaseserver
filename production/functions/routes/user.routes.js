const express = require('express');
const FBAuth = require('../utils/fbAuth');
const {
  signup,
  signin,
  changeUsername,
  uploadImage,
  editUserDetails,
  getAuthenticatedUser,
  // may need to relax this
  getUserData,
  followUser,
  unFollowUser,
  // may need to relax this
  getAllUsers,
  resetPassword,
  forgotPassword,
  updatePassword,
  updateEmailAdd,
  getAllUsernames,
  activateUser,
  refreshToken,
  markNotificationsRead,
  uploadBackgroundImage,
  deleteNotification,
  uploadCV,
  editBio,
  editOrganisationDetails,
  getLoggedInUserFollowingList,
  editComment,
  addProfileUrlToAllUsers,
  logout,
  getDigitalCV,
  getMyDigitalCV,
  addProfileVideo,
} = require('../controllers/user.controller');

const router = express.Router();

// Auth Requests

router.route('/signup').post(signup);

router.route('/signin').post(signin);

router.route('/logout').post(logout);

router.route('/forgot-password').post(forgotPassword);

router.route('/reset-password').post(resetPassword);

router.route('/usernames').get(getAllUsernames);

router.route('/activate/user/:userId').get(activateUser);

router.route('/refresh-token/:userId').post(FBAuth.protect, refreshToken);

router.route('/update-email').post(FBAuth.protect, updateEmailAdd);

router.route('/update-password').post(FBAuth.protect, updatePassword);

// User Requests
router.route('/users').get(getAllUsers);

router
  .route('/user')
  .post(FBAuth.protect, editUserDetails)
  .get(FBAuth.protect, getAuthenticatedUser);

router.route('/user/:userId').get(getUserData);

router.route('/user/image').post(FBAuth.protect, uploadImage);

router
  .route('/user/background-image')
  .post(FBAuth.protect, uploadBackgroundImage);

router.route('/user/cv').post(FBAuth.protect, uploadCV);

router.route('/user/username').post(FBAuth.protect, changeUsername);

router.route('/user/edit-bio').post(FBAuth.protect, editBio);

router
  .route('/user/edit-organisation')
  .post(FBAuth.protect, editOrganisationDetails);

router
  .route('/notifications/:notificationId')
  .post(FBAuth.protect, markNotificationsRead)
  .delete(FBAuth.protect, deleteNotification);

router.route('/user/:userId/follow').get(FBAuth.protect, followUser);

router.route('/user/:userId/unfollow').get(FBAuth.protect, unFollowUser);

router
  .route('/user-following')
  .get(FBAuth.protect, getLoggedInUserFollowingList);

router.route('/comment/:commentId').post(FBAuth.protect, editComment);

router.route('/update-user-profile-url').get(addProfileUrlToAllUsers);

router.route('/digital-cv/:userId').get(FBAuth.protect, getDigitalCV);
router.route('/digital-cv').get(FBAuth.protect, getMyDigitalCV);
router.route('/user/profile-video').post(FBAuth.protect, addProfileVideo);

module.exports = router;
