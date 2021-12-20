const express = require('express')
const FBAuth = require('../utils/fbAuth');
const {
    // signup,
    // changeUsername,
    // uploadImage,
    // editUserDetails,
    // getAuthenticatedUser,
    // getUserData,
    // followUser,
    // removeFollowing,
    // removeFollower,
    // getAllUsers,
    // resetPassword,
    // updatePassword,
    // updateEmailAdd,
    // getAllUsernames,
    // activateUser,
    // adminLogin,
    // handleChange
    //markNotificationsRead
    contactUs
} = require('../controllers/admin.controller');

const router = express.Router()

router.route('/contact-us')
  .post(contactUs)

// router.route('/admin/signup')
//   .post(signup)


// router.route('/admin/login')
//   .post(adminLogin)

// router.route('/user/image')
//   .post( FBAuth.protect, uploadImage)

// router.route('/usernames')
//   .get(getAllUsernames)

// router.route('/user/username')
//   .post(FBAuth.protect, changeUsername)

// router.route('/activate/user/:userId')
//   .get(activateUser)

// router.route('/user/:userId')
//   .get(getUserData)

// router.route('/user')
//   .post(FBAuth.protect, editUserDetails)
//   .get(FBAuth.protect, getAuthenticatedUser)

// router.route('/user/:userId/follow')
//   .get(FBAuth.protect, followUser)

// router.route('/user/:userId/unfollow')
//   .get(FBAuth.protect, removeFollowing, removeFollower)

// router.route('/users')
//   .get(FBAuth.restrictToAdmin, getAllUsers)

// router.route('/reset-password')
//   .post(resetPassword)

  
// router.route('/update-password')
//   .post(FBAuth.protect, updatePassword)

// router.route('/update-email')
//   .post(FBAuth.protect, updateEmailAdd)

module.exports = router;