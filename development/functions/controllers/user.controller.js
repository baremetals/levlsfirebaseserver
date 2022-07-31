const { admin, db, firebase, defaultAuth, dayjs } = require('../utils/admin');
const config = require('../utils/database');
const { uuid } = require('uuidv4');
const sgMail = require('@sendgrid/mail');
const request = require('request');
// import cookie from 'cookie';

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
  validateEmailData,
  validatePasswordChange,
  reduceBioDetails,
  reduceOrganisationDetails,
} = require('../utils/validators');

// Refresh user token
exports.refreshToken = (req, res) => {
  const userId = req.params.userId;
  db.doc(`users/${userId}`)
    .get()
    .then((doc) => {
      if (!doc) {
        return res.status(403).json({ error: 'are you sure?.' });
      } else {
        admin
          .auth()
          .createCustomToken(userId)
          .then((customToken) => {
            return res.json({ customToken });
          });
      }
    })
    .catch((error) => {
      console.log('Error creating custom token:', error);
    });
};

// Create a unique username

exports.changeUsername = (req, res) => {
  const usernames = db.collection('usernames');
  const users = db.collection('users');
  const regex = /^[a-zA-Z0-9\d-_]*$/;

  // ensure user supplied a username to attempt on
  if (req.body.username.trim().length <= 3) {
    return res.status(400).json({
      status: 400,
      error: 'Your username must have 4 characters or more.',
    });
  }
  if (req.body.username.trim().length > 15) {
    return res.status(400).json({
      status: 400,
      error: 'Your username must have a maximum of 15 characters.',
    });
  }

  if (regex.test(req.body.username.trim()) !== true)
    errors.username =
      'Username must only contain letters, numbers, or an underscore(a-z0-9/_)';
  // console.log(req.user)
  let username = req.body.username.trim().toLowerCase();
  let unameRef = usernames.doc(username);
  let unameQuery = usernames.where('uid', '==', req.user.userId);
  let userRef = users.doc(req.user.userId);

  db.runTransaction((tx) => {
    return (
      tx
        .get(unameRef)
        .then((unameDoc) => {
          // check if usernmae is already assigned to the current user
          if (unameDoc.exists && unameDoc.data.uid === req.user.userId) {
            return res
              .status(400)
              .json({ error: 400, code: 'you already own this username' });
          }

          // if its not assigned and exists someone else owns it
          if (unameDoc.exists) {
            return res
              .status(400)
              .json({
                error: 400,
                code: 'sorry this username is already taken',
              });
          }

          return Promise.resolve();
        })

        // query usernamaes
        .then(() => tx.get(unameQuery))

        // allow a user to change their username by deleting a previously set one
        // ensure user only has one username by deleting any references found
        .then((querySnapshot) => {
          return Promise.all(
            querySnapshot.docs.map((doc) => tx.delete(doc.ref))
          );
        })

        // assign the username to the authenticated user
        .then(() =>
          tx.set(
            unameRef,
            {
              uid: req.user.userId,
              imageUrl: req.user.imageUrl,
              isActive: true,
              username: username,
              fullname: req.user.fullname || '',
              organisationName: req.user.organisationName || '',
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          )
        )

        // write their new username to the user record for easy access
        // username has been modified to ensure uniqueness trimmed & lowercased
        .then(() => tx.set(userRef, { username: username }, { merge: true }))
    );
  })
    .then(() => {
      res.json({
        username: username, // return the formatted username
        success: 'successfully acquired username',
      });
    })

    .catch((err) => {
      return res.status(err.code || 500).json(err);
    });
};
// Log user in
exports.sessionsLogin = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  let userDoc;
  const getUser = db
    .collection('users')
    .where('email', '==', user.email)
    .limit(1);

  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  getUser
    .get()
    .then((data) => {
      if (data) {
        data.forEach((doc) => {
          userDoc = doc.data();
        });
        return userDoc;
      }
    })
    .then(() => {
      if (userDoc.verified !== true) {
        console.log(userDoc.verified);
        return res.status(403).json({
          error:
            'Please activate your account, check your email for the activation link.',
        });
      } else {
        firebase
          .auth()
          .signInWithEmailAndPassword(user.email, user.password)
          .then((data) => {
            return data.user.getIdToken();
          })
          .then((token) => {
            return res.json({ token });
          })
          .catch(function (error) {
            console.error(error);
            console.log(error);
            if (error.code.startsWith('auth')) {
              return res
                .status(403)
                .json({ error: 'wrong email or password, please try again' });
            } else {
              return res
                .status(403)
                .json({ error: 'wrong credentials, please try again' });
            }
          });
      }
    })
    .catch(function (error) {
      console.error(error);
      return res
        .status(403)
        .json({ error: 'wrong credentials, please try again' });
    });
};

// Old Reset Password method
exports.oldResetPassword = (req, res) => {
  const email = req.body.email;
  console.log(req.body);
  const { valid, errors } = validateEmailData(email);

  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .sendPasswordResetEmail(email)
    .then(() => {
      return res
        .status(201)
        .json({
          success: 'email sent, please check your inbox and spam/junk folders.',
        });
    })
    .catch((err) => {
      console.error(err);
      return res
        .status(403)
        .json({ error: "email doesn't exist, please create an account" });
    });
};

// Update user email-logged-in
exports.updateEmailAdd = (req, res) => {
  const user = firebase.auth().currentUser;

  const newEmail = req.body.email;

  const credentials = {
    email: req.body.email,
    // password: req.body.password,
  };
  const { valid, errors } = validateEmailData(newEmail);
  if (!valid) return res.status(400).json(errors);

  console.log(newEmail);

  user
    .updateEmail(newEmail)
    .then(() => {
      db.doc(`/users/${req.user.userId}`).update(credentials);
    })
    .then(() => {
      user.sendEmailVerification();
    })
    .then(function () {
      return res.status(201).json({ success: 'email has been updated' });
    })
    .catch((err) => {
      console.error(err);
      return res
        .status(403)
        .json({ error: 'unsuccessful, please try again later' });
    });

  // user.reauthenticateWithCredential(credentials).then(function() {

  // }).catch(function(error) {
  //   // An error happened.
  // });
};

// Update user password-logged-in
exports.updatePassword = (req, res) => {
  const user = firebase.auth().currentUser;
  const newPassword = {
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  };

  const { valid, errors } = validatePasswordChange(newPassword);

  if (!valid) return res.status(400).json(errors);

  user
    .updatePassword(newPassword.password)
    .then(() => {
      return res
        .status(201)
        .json({ success: 'your password has been updated' });
    })
    .catch((err) => {
      console.error(err);
      return res
        .status(403)
        .json({ error: 'password rejected, please try again' });
    });
};

// Edit user details
exports.editUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);
  console.log(userDetails);
  db.doc(`/users/${req.user.userId}`)
    .update(userDetails)
    .then(() => {
      return res.json({ success: 'Details edited successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Edit userBio
exports.editBio = (req, res) => {
  let bioDetails = reduceBioDetails(req.body);
  console.log(bioDetails);
  db.doc(`/users/${req.user.userId}`)
    .update(bioDetails)
    .then(() => {
      return res.json({ success: 'Bio edited successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Edit Organisation details
exports.editOrganisationDetails = (req, res) => {
  let orgDetails = reduceOrganisationDetails(req.body);
  console.log(orgDetails);
  db.doc(`/users/${req.user.userId}`)
    .update(orgDetails)
    .then(() => {
      return res.json({ success: 'Details edited successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.getUserData = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.userId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection(`users/${req.params.userId}/educations`)
          .orderBy('createdAt', 'desc')
          .limit(4)
          .get();
      }
    })
    .then((data) => {
      userData.educations = [];
      data.forEach((doc) => {
        userData.educations.push({
          educationId: doc.id,
          courseName: doc.data().courseName,
          schoolName: doc.data().schoolName,
          schoolLocation: doc.data().schoolLocation,
          createdAt: doc.data().createdAt,
          startYear: doc.data().startYear,
          endYear: doc.data().endYear,
          finalGrade: doc.data().finalGrade,
          gradeAchieved: doc.data().gradeAchieved,
          fieldOfStudy: doc.data().fieldOfStudy,
        });
      });
      return db
        .collection(`users/${req.params.userId}/experiences`)
        .orderBy('createdAt', 'desc')
        .limit(4)
        .get();
    })
    .then((data) => {
      userData.experiences = [];
      data.forEach((doc) => {
        userData.experiences.push({
          experienceId: doc.id,
          companyName: doc.data().companyName,
          currentRole: doc.data().currentRole,
          employmentType: doc.data().employmentType,
          createdAt: doc.data().createdAt,
          startDate: doc.data().startDate,
          endDate: doc.data().endDate,
          jobTitle: doc.data().jobTitle,
          location: doc.data().location,
        });
      });
      return db
        .collection(`users/${req.params.userId}/skills`)
        .orderBy('createdAt', 'desc')
        .limit(4)
        .get();
    })
    .then((data) => {
      userData.skills = [];
      data.forEach((doc) => {
        userData.skills.push({
          skillId: doc.id,
          knowledgeList: doc.data().knowledgeList,
          otherSkillsList: doc.data().otherSkillsList,
          skillsList: doc.data().skillsList,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Get own user details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.userId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection(`users/${req.user.userId}/educations`)
          .orderBy('createdAt', 'desc')
          .limit(4)
          .get();
      }
    })
    .then((data) => {
      userData.educations = [];
      data.forEach((doc) => {
        userData.educations.push({
          educationId: doc.id,
          courseName: doc.data().courseName,
          schoolName: doc.data().schoolName,
          schoolLocation: doc.data().schoolLocation,
          createdAt: doc.data().createdAt,
          startYear: doc.data().startYear,
          endYear: doc.data().endYear,
          gradeAchieved: doc.data().gradeAchieved,
          fieldOfStudy: doc.data().fieldOfStudy,
          finalGrade: doc.data().finalGrade,
        });
      });
      return db
        .collection(`users/${req.user.userId}/experiences`)
        .orderBy('createdAt', 'desc')
        .limit(4)
        .get();
    })
    .then((data) => {
      userData.experiences = [];
      data.forEach((doc) => {
        userData.experiences.push({
          experienceId: doc.id,
          companyName: doc.data().companyName,
          currentRole: doc.data().currentRole,
          employmentType: doc.data().employmentType,
          createdAt: doc.data().createdAt,
          startDate: doc.data().startDate,
          endDate: doc.data().endDate,
          jobTitle: doc.data().jobTitle,
          location: doc.data().location,
        });
      });
      return db
        .collection(`users/${req.user.userId}/skills`)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
    })
    .then((data) => {
      userData.skills = [];
      data.forEach((doc) => {
        userData.skills.push({
          skillId: doc.id,
          knowledgeList: doc.data().knowledgeList,
          otherSkillsList: doc.data().otherSkillsList,
          skillsList: doc.data().skillsList,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Get all usernames
exports.getAllUsernames = (_req, res) => {

  db.collection('usernames')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let usernames = [];
      data.forEach((doc) => {
        usernames.push({
          userId: doc.data().uid,
          username: doc.id,
          fullname: doc.data().fullname,
          organisationName: doc.data().organisationName,
          isActive: doc.data().isActive,
          imageUrl: doc.data().imageUrl,
        });
        console.log(usernames);
      });

      return res.json(usernames);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Upload a profile image for user
exports.uploadImage = (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  if (req.body.imageUrl) {
    const imageUrl = req.body.imageUrl;
    db.doc(`/users/${req.user.userId}`).update({ imageUrl });
    return res.json({ success: 'image uploaded successfully' });
  } else {
    const busboy = new BusBoy({ headers: req.headers });

    let imageToBeUploaded = {};
    let imageFileName;
    // String for image token
    let generatedToken = uuid();

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      if (
        mimetype !== 'image/jpeg' &&
        mimetype !== 'image/png' &&
        mimetype !== 'image/jpg'
      ) {
        console.log(fieldname, file, filename, encoding, mimetype);
        return res.status(400).json({ error: 'Wrong file type submitted' });
      }
      // my.image.png => ['my', 'image', 'png']
      const imageExtension =
        filename.split('.')[filename.split('.').length - 1];
      // 32756238461724837.png
      imageFileName = `${Math.round(
        Math.random() * 1000000000000
      ).toString()}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
      admin
        .storage()
        .bucket(config.storageBucket)
        .upload(imageToBeUploaded.filepath, {
          destination: `profile-images/${imageFileName}`,
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
              //Generate token to be appended to imageUrl
              firebaseStorageDownloadTokens: generatedToken,
            },
          },
        })
        .then(() => {
          // Append token to url
          const imageUrl = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/profile-images%2F${imageFileName}?alt=media&token=${generatedToken}`;
          return db.doc(`/users/${req.user.userId}`).update({ imageUrl });
        })
        .then(() => {
          return res.json({ success: 'image uploaded successfully' });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: 'something went wrong' });
        });
    });
    busboy.end(req.rawBody);
  }
};

// Upload a background image for user
exports.uploadBackgroundImage = (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  if (req.body.backgroundImage) {
    const backgroundImage = req.body.backgroundImage;
    db.doc(`/users/${req.user.userId}`).update({ backgroundImage });
    return res.json({ success: 'image uploaded successfully' });
  } else {
    const busboy = new BusBoy({ headers: req.headers });

    let imageToBeUploaded = {};
    let imageFileName;
    // String for image token
    let generatedToken = uuid();

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(fieldname, file, filename, encoding, mimetype);
      if (
        mimetype !== 'image/jpeg' &&
        mimetype !== 'image/png' &&
        mimetype !== 'image/jpg'
      ) {
        return res.status(400).json({ error: 'Wrong file type submitted' });
      }
      // my.image.png => ['my', 'image', 'png']
      const imageExtension =
        filename.split('.')[filename.split('.').length - 1];
      // 32756238461724837.png
      imageFileName = `${Math.round(
        Math.random() * 1000000000000
      ).toString()}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
      admin
        .storage()
        .bucket(config.storageBucket)
        .upload(imageToBeUploaded.filepath, {
          destination: `user-uploads/${imageFileName}`,
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
              //Generate token to be appended to imageUrl
              firebaseStorageDownloadTokens: generatedToken,
            },
          },
        })
        .then(() => {
          // Append token to url
          const backgroundImage = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/user-uploads%2F${imageFileName}?alt=media&token=${generatedToken}`;
          return db
            .doc(`/users/${req.user.userId}`)
            .update({ backgroundImage });
        })
        .then(() => {
          return res.json({ success: 'image uploaded successfully' });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: 'something went wrong' });
        });
    });
    busboy.end(req.rawBody);
  }
};

// Upload a CV for user
exports.uploadCV = (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({ headers: req.headers });

  let imageToBeUploaded = {};
  let imageFileName;
  // String for image token
  let generatedToken = uuid();

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (
      mimetype !== 'application/msword' &&
      mimetype !== 'application/pdf' &&
      mimetype !==
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return res
        .status(400)
        .json({
          error: 'Wrong file type submitted. Only word and pdf files allowed',
        });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split('.')[filename.split('.').length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on('finish', () => {
    admin
      .storage()
      .bucket(config.storageBucket)
      .upload(imageToBeUploaded.filepath, {
        destination: `user-cv/${imageFileName}`,
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
            //Generate token to be appended to imageUrl
            firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })
      .then(() => {
        // Append token to url
        const CV = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/user-cv%2F${imageFileName}?alt=media&token=${generatedToken}`;
        return db.doc(`/users/${req.user.userId}`).update({ CV });
      })
      .then(() => {
        return res.json({ success: 'Your CV was uploaded successfully' });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: 'something went wrong' });
      });
  });
  busboy.end(req.rawBody);
};

exports.getAllUsers = (_req, res) => {
  db.collection('users')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let allUsers = [];
      data.forEach((doc) => {
        allUsers.push({
          userId: doc.id,
          fullname: doc.data().fullname,
          username: doc.data().username,
          imageUrl: doc.data().imageUrl,
          backgroundImage: doc.data().backgroundImage,
          organisationName: doc.data().organisationName,
          organisationType: doc.data().organisationType,
          followersCount: doc.data().followersCount,
          followingCount: doc.data().followingCount,
          userType: doc.data().userType,
          occupation: doc.data().occupation,
        });
      });
      return res.json(allUsers);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.markNotificationsRead = (req, res) => {
  const notificationDoc = db.doc(`/notifications/${req.params.notificationId}`);
  notificationDoc
    .update({ read: true })
    .then(() => {
      return res.json({ success: 'Notification marked read' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.markAllNotificationsRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ success: 'Notifications marked read' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.deleteNotification = (req, res) => {
  const notificationDoc = db.doc(`/notifications/${req.params.notificationId}`);
  notificationDoc
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Notification not found' });
      } else {
        return notificationDoc.delete();
      }
    })
    .then(() => {
      res.json({ success: 'Notification deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.activateUser = (req, res) => {
  let profileUrl;

  const userDocument = db.doc(`/users/${req.params.userId}`);
  let username;
  let userData;

  defaultAuth
    .updateUser(req.params.userId, {
      emailVerified: true,
    })
    .then(() => {
      userDocument
        .get()
        .then((doc) => {
          if (doc.exists) {
            const companyLink = `https://levls.io/company-profile/${req.params.userId}`;
            const userLink = `https://levls.io/profile/${req.params.userId}`;

            const options = {
              method: 'POST',
              url: `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${config.apiKey}`,
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                dynamicLinkInfo: {
                  domainUriPrefix: 'https://levlsapp.page.link',
                  link:
                    doc.data().userType === 'Organisation'
                      ? companyLink
                      : userLink,
                  androidInfo: {
                    androidPackageName: 'com.pandabares.justappli',
                  },
                },
              }),
            };
            userData = doc.data();
            username = userData.username;
            userData.userId = doc.id;
            const url = `https://levls.io/${
              doc.data().userType === 'Organisation'
                ? 'company-profile'
                : 'profile'
            }/${req.params.userId}`;
            request(options, function (error, response) {
              if (error) throw new Error(error);
              const data = JSON.parse(response.body);
              // console.log(data)
              profileUrl = data.shortLink ? data.shortLink : url;
              userDocument.update({
                isActive: true,
                verified: true,
                profileUrl: profileUrl,
              });
            });
            db.doc(`/usernames/${username}`).update({ isActive: true });
            return res
              .status(202)
              .json({ success: 'your account is now active you may log in' });
          } else {
            return res.status(404).json({ error: 'Your token Has expired' });
          }
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: err.code });
        });
    })
    .catch((error) => {
      console.log('Error updating user:', error);
      return res
        .status(500)
        .json({ error: 'something went wrong, please try again later' });
    });
  
};

exports.getLoggedInUserFollowingList = (req, res) => {
  let userData = {};
  db.doc(`users/${req.user.userId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection(`users/${req.user.userId}/followings`)
          .orderBy('createdAt', 'desc')
          .get();
      }
    })
    .then((data) => {
      userData.followings = [];
      data.forEach((doc) => {
        if (doc.id !== config.levlsUserId) {
          userData.followings.push({
            followingId: doc.id,
            followedUserBkImage: doc.data().followedUserBkImage,
            followedUserCountry: doc.data().followedUserCountry,
            followedUserCity: doc.data().followedUserCity,
            createdAt: doc.data().createdAt,
            followedUserId: doc.data().followedUserId,
            followedUserImageUrl: doc.data().followedUserImageUrl,
            followedUserOccupationOrIndustry:
            doc.data().followedUserOccupationOrIndustry,
            followedUserUsername: doc.data().followedUserUsername,
            fieldOfStudy: doc.data().fieldOfStudy,
          });
        }
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.followUser = (req, res) => {
  // document for the user being followed
  const followedUserDocument = db
    .collection('followers')
    .where('followerUserId', '==', req.user.userId)
    .where('userId', '==', req.params.userId)
    .limit(1);

  // document for the follower
  const followerUserDocument = db.doc(
    `users/${req.user.userId}/followings/${req.params.userId}`
  );

  const followedUserDoc = db.doc(`/users/${req.params.userId}`);
  const followerDoc = db.doc(`/users/${req.user.userId}`);

  let followedUserData;
  let followerData = {};
  const followerUsername = req.user.username;
  const followerCity = req.user.city;
  const followerCountry = req.user.country;
  const followerOccupation = req.user.occupation;
  const followerIndustry = req.user.industry;
  let followedUsername;
  let followedImgUrl;
  let followedUserBkImage;
  let followedUserCity;
  let followedUserCountry;
  let followedUserOccupation;
  let followedUserIndustry;

  db.doc(`/users/${req.user.userId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        followerData.cred = doc.data();
        // followerUsername = followerData.cred.username;
        return followedUserDoc.get();
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    })
    .then((doc) => {
      if (doc.exists) {
        followedUserData = doc.data();
        followedUserData.userId = doc.id;
        followedImgUrl = followedUserData.imageUrl;
        followedUsername = followedUserData.username;
        followedUserBkImage = followedUserData.backgroundImage;
        followedUserCity = followedUserData.city;
        followedUserCountry = followedUserData.country;
        followedUserOccupation = followedUserData.occupation;
        followedUserIndustry = followedUserData.industry;

        return followedUserDocument.get();
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection('followers')
          .add({
            createdAt: new Date().toISOString(),
            followerUsername,
            followerImageUrl: req.user.imageUrl,
            followerUserId: req.user.userId,
            followerBkImage: req.user.backgroundImage,
            userId: req.params.userId,
            followerCity,
            followerCountry,
            followerOccupationOrIndustry:
              followerOccupation || followerIndustry,
          })
          .then(() => {
            followedUserData.followersCount++;
            return followedUserDoc.update({
              followersCount: followedUserData.followersCount,
            });
          });
      } else {
        return res.status(400).json({ error: 'Already following this user' });
      }
    })
    .then(() => {
      return followerUserDocument.get();
    })
    .then((doc) => {
      if (!doc.exists) {
        return db
          .doc(`users/${req.user.userId}/followings/${req.params.userId}`)
          .set({
            createdAt: new Date().toISOString(),
            followedUserId: req.params.userId,
            followedUserImageUrl: followedImgUrl,
            followedUserUsername: followedUsername,
            followedUserBkImage: followedUserBkImage,
            followedUserCity: followedUserCity,
            followedUserCountry: followedUserCountry,
            followedUserOccupationOrIndustry:
              followedUserOccupation || followedUserIndustry,
          })
          .then(() => {
            followerData.cred.followingCount++;
            return followerDoc.update({
              followingCount: followerData.cred.followingCount,
            });
          })
          .then(() => {
            return res.status(201).json({ success: 'it is all done' });
          });
      } else {
        return res
          .status(400)
          .json({ error: `You are already following ${followedUsername}` });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.unFollowUser = (req, res) => {
  // document for the user folllowing
  const followingDocument = db.doc(
    `users/${req.user.userId}/followings/${req.params.userId}`
  );

  // document for the user being followed
  const followerDocument = db
    .collection('followers')
    .where('followerUserId', '==', req.user.userId)
    .where('userId', '==', req.params.userId)
    .limit(1);

  const followedUserDoc = db.doc(`/users/${req.params.userId}`);
  const followerDoc = db.doc(`/users/${req.user.userId}`);

  let followedUserData;
  let followerData;

  followerDoc
    .get()
    .then((doc) => {
      if (doc.exists) {
        followerData = doc.data();
        followerData.userId = doc.id;
        return followingDocument.get();
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    })
    .then((doc) => {
      if (!doc.exists) {
        return res.status(400).json({ error: 'User not followed' });
      } else {
        return db
          .doc(`users/${req.user.userId}/followings/${req.params.userId}`)
          .delete()
          .then(() => {
            followerData.followingCount--;
            followerDoc.update({ followingCount: followerData.followingCount });
            return followedUserDoc.get();
          });
      }
    })
    .then((doc) => {
      if (doc.exists) {
        followedUserData = doc.data();
        followedUserData.userId = doc.id;
        return followerDocument.get();
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: 'User not followed' });
      } else {
        return db.doc(`followers/${data.docs[0].id}`).delete();
      }
    })
    .then(() => {
      followedUserData.followersCount--;
      return followedUserDoc.update({
        followersCount: followedUserData.followersCount,
      });
    })
    .then(() => {
      res.status(201).json({ success: 'You have unfollowed the user' });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.editComment = (req, res) => {
  let commentDetails = req.body;
  const commentDocument = db.doc(`/comments/${req.params.commentId}`);

  commentDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      commentDocument.update(commentDetails);
      return res.json({ message: 'Details updated successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// script to add profileUrl to each user that does not have 1
exports.addProfileUrlToAllUsers = (_req, res) => {
  let profile;
  let profileUrl;

  db.collection('users')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      data.forEach((doc) => {
        if (doc.data().userType !== 'Organisation') {
          profile = 'profile';
        } else profile = 'company-profile';

        const options = {
          method: 'POST',
          url: `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${config.apiKey}`,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dynamicLinkInfo: {
              domainUriPrefix: 'https://levls.page.link',
              link: `https://levls.io/${profile}/${doc.id}`,
              androidInfo: { androidPackageName: 'com.pandabares.justappli' },
            },
          }),
        };
        return request(options, function (error, response) {
          if (error) throw new Error(error);
          console.log('the function run');
          const info = JSON.parse(response.body);
          profileUrl = info.shortLink;
          console.log(profileUrl);
          doc.ref.update({ profileUrl: profileUrl });
        });
      });
    })
    .then(async () => {
      await res.status(200).json({ success: 'you did the damn thing bro' });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Forgot Password
exports.forgotPassword = (req, res) => {
  defaultAuth
    .getUserByEmail(req.body.email)
    .then(async (userRecord) => {
      await db
        .doc(`/users/${userRecord.uid}`)
        .get()
        .then(async (doc) => {
          if (doc.exists) {
            const userData = doc.data();
            let generatedToken = uuid();
            const msg = {
              to: `${userData.email}`, // recipient
              from: 'LEVLS. <noreply@levls.io>', // Change to verified sender
              template_id: 'd-fe6fd5a700634f01a11e477d1bace216',
              dynamic_template_data: {
                subject: 'Levls Reset Password Request',
                username: userData.fullname || userData.username,
                url: `https://levls.io/reset-password/${generatedToken}`,
                buttonText: 'Reset Password',
              },
            };
            const resetPasswordData = {
              code: generatedToken,
              createdAt: new Date().toISOString(),
              userId: userData.userId,
            };
            await db
              .doc(`resetPasswordTokens/${generatedToken}`)
              .set(resetPasswordData)
            .then(async () => {
              await sgMail.send(msg);
            return res
              .status(201)
              .json({ success: 'Please check your email for the reset password link.' });
            })
          }
        });
    })
    .catch((error) => {
      if (error.code === 'auth/user-not-found') {
        return res
          .status(403)
          .json({ error: 'the email address does not exist' });
      }
      console.log('Error fetching user data:', error);
    });
};

// Reset Password 
exports.resetPassword = (req, res) => {
  // const user = firebase.auth().currentUser;
  const newPassword = {
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  };

  const getTokenDoc = db
    .doc(`resetPasswordTokens/${req.body.code}`)

  const { valid, errors } = validatePasswordChange(newPassword);

  if (!valid) return res.status(400).json(errors);

  getTokenDoc
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res
          .status(403)
          .json({ error: 'Invalid token please request a new token' });
      } else {
        const data = doc.data();
        const currentDate = dayjs(new Date());
        const createdAt = dayjs(data.createdAt);
        const expiryDate = currentDate.diff(createdAt, 'hour');
        if (expiryDate / 24 >= 2) return res
          .status(403)
          .json({ error: 'Invalid token please request a new token' });
        // console.log(date1.diff(date2, 'hour'));
        defaultAuth
          .updateUser(data.userId, { password: newPassword.password })
          .then(async () => {
            await db.doc(`users/${data.userId}`)
              .get()
              .then(async (userDoc) => {
                const userData = userDoc.data();
                const msg = {
                  to: `${userData.email}`, // recipient
                  from: 'LEVLS. <noreply@levls.io>', // Change to verified sender
                  template_id: 'd-6e028d8750a64cddbce63c8570951395',
                  dynamic_template_data: {
                    subject: 'Levls Password Reset',
                    username: userData.fullname || userData.username,
                    url: `https://levls.io/login`,
                    buttonText: 'Login',
                  },
                };
                await sgMail.send(msg);
              })
              .then(async () => {
                await getTokenDoc.delete();
                return res
                  .status(201)
                  .json({ success: 'Your password has been changed' });
              });
          });
      }
    })
    .catch((err) => {
      console.error(err);
      return res
        .status(403)
        .json({ error: 'Something went wrong please try again later' });
    });
};

// Log user in
exports.sessionsLogin = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  let userDoc;
  const getUser = db
    .collection('users')
    .where('email', '==', user.email)
    .limit(1);

  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  getUser
    .get()
    .then((data) => {
      if (data) {
        data.forEach((doc) => {
          userDoc = doc.data();
        });
        return userDoc;
      }
    })
    .then(() => {
      if (userDoc.verified !== true) {
        console.log(userDoc.verified);
        return res.status(403).json({
          error:
            'Please activate your account, check your email for the activation link.',
        });
      } else {
        firebase
          .auth()
          .signInWithEmailAndPassword(user.email, user.password)
          .then((data) => {
            return data.user.getIdToken();
          })
          .then((token) => {
            // Set session expiration to 5 days.
            const expiresIn = 60 * 60 * 24 * 5 * 1000;
            defaultAuth.createSessionCookie(token, { expiresIn }).then(
              (sessionCookie) => {
                // Set cookie policy for session cookie.
                const options = {
                  maxAge: expiresIn,
                  httpOnly: true,
                  secure: true,
                };
                res.cookie('levls-session', sessionCookie, options);
                res.end(JSON.stringify({ status: 'success' }));
              },
              (error) => {
                res.status(401).send('UNAUTHORIZED REQUEST!');
              }
            );
            // return res.json({ token });
          })
          .catch(function (error) {
            console.error(error);
            console.log(error);
            if (error.code.startsWith('auth')) {
              return res
                .status(403)
                .json({ error: 'wrong email or password, please try again' });
            } else {
              return res
                .status(403)
                .json({ error: 'wrong credentials, please try again' });
            }
          });
      }
    })
    .catch(function (error) {
      console.error(error);
      return res
        .status(403)
        .json({ error: 'wrong credentials, please try again' });
    });
};


// Sign users up
exports.signup = (req, res) => {
  let usageTotalRef;
  const increment = admin.firestore.FieldValue.increment(1);
  const inActiveUsersRef = db.collection('site stats').doc('inactive-users');
  const totalUsersRef = db.collection('site stats').doc('all-users');
  if (req.body.signUpCode !== '')
    usageTotalRef = db.collection('codes').doc(req.body.signUpCode);
  const batch = db.batch();

  const adminMsg = {
    to: 'admin@levls.io', // recipient
    from: 'LEVLS. <noreply@levls.io>',
    subject: `New user sign up - ${req.body.username}`,
    text: `${req.body.username}, just created an account`,
    html: `
        <h3> Hello Admin </h3>
        <p>You have a new ${req.body.userType || 'Personal'} user.</p>
        <p>Thank You.</p>
        <p>LEVLS</p>
      `,
  };

  const newUser = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    username: req.body.username,
    dateOfBirth: req.body.dateOfBirth,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    userType: req.body.userType || 'Personal',
    deviceToken: req.body.deviceToken || '',
    signUpCode: req.body.signUpCode || '',
  };

  const { valid, errors } = validateSignupData(newUser);
  const noImg = 'default.jpg';
  const bkgImage = 'background.jpg';
  let userId, uid;

  if (!valid) {
    return res.status(400).json(errors);
  } else {
    db.collection('usernames')
      .doc(`${newUser.username}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          return res.status(400).json({ error: 'username is already in use' });
        }
        defaultAuth
          .createUser({
            email: newUser.email,
            emailVerified: false,
            password: newUser.password,
            displayName: newUser.username,
            disabled: false,
          })
          .then((userRecord) => {
            userId = userRecord.uid;
            uid = userRecord.uid;
          })
          .then(async () => {
            const userCredentials = {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              firstName: newUser.firstName,
              lastName: newUser.lastName,
              fullname: newUser.firstName + ' ' + newUser.lastName,
              Pronouns: '',
              username: newUser.username,
              occupation: '',
              dateOfbirth: newUser.dateOfBirth,
              email: newUser.email,
              mobile: '',
              gender: '',
              imageUrl: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/${noImg}?alt=media&token=${config.defaultimgtoken}`,
              backgroundImage: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/${bkgImage}?alt=media&token=${config.defaultbkimgtoken}`,
              userId,
              bio: '',
              CV: '',
              website: '',
              slogan: '',
              numberOrname: '',
              street: '',
              city: 'London',
              country: 'England',
              postcode: '',
              followersCount: 0,
              followingCount: 0,
              userType: newUser.userType,
              verified: false,
              acceptedTerms: true,
              isActive: false,
              deviceToken: newUser.deviceToken,
              instagram: '',
              tiktok: '',
              twitter: '',
              linkedIn: '',
              profileUrl: '',
              signUpCode: newUser.signUpCode,
            };
            await db.doc(`/users/${userId}`).set(userCredentials);
            await db
              .doc(`users/${userId}/followings/${config.levlsUserId}`)
              .set({
                createdAt: new Date().toISOString(),
                followedUserId: config.levlsUserId,
                followedUserImageUrl: config.levlsLogoUrl,
                followedUserUsername: 'levls',
                followedUserBkImage: config.levlsBkImage,
                followedUserCity: 'London',
                followedUserCountry: 'UK',
                followedUserOccupationOrIndustry: 'Technology',
              });
            return db
              .collection('usernames')
              .doc(`${newUser.username}`)
              .set({
                uid,
                createdAt: new Date().toISOString(),
                imageUrl: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/${noImg}?alt=media&token=${config.defaultimgtoken}`,
                fullname: '',
                isActive: false,
              })
              // .then(() => {
              //   const userExperience = {};
              //   db.collection(`users/${userId}/experiences`).add(
              //     userExperience
              //   );
              // })
              // .then(() => {
              //   const userEducation = {};
              //   db.collection(`users/${userId}/educations`).add(userEducation);
              // })
              // .then(() => {
              //   const userSkills = {};
              //   db.collection(`users/${userId}/skills`).add(userSkills);
              // })
              // .then(() => {
              //   const userInterests = {};
              //   db.collection(`users/${userId}/interests`).add(userInterests);
              //   //
              // })
              .then(() => {
                batch.set(
                  totalUsersRef,
                  { totalCount: increment },
                  { merge: true }
                );
                batch.set(
                  inActiveUsersRef,
                  { totalCount: increment },
                  { merge: true }
                );
                if (req.body.signUpCode !== '')
                  batch.set(
                    usageTotalRef,
                    { usageTotal: increment },
                    { merge: true }
                  );
                batch.commit();
              })
              .then(async () => {
                await sgMail.send(adminMsg);
                return res
                  .status(201)
                  .json({ success: 'Your user account has been created.' });
              })
              .catch(err => {
                console.error(err);
                return res.status(500).json({
                  error: 'The server is out for lunch, please try again later.',
                });
              })
          })
          .catch((err) => {
            console.error(err);
            if (err.code === 'auth/email-already-exists') {
              return res.status(400).json({ error: 'Email is already in use' });
            } else {
              return res.status(500).json({
                error: 'The server is out for lunch, please try again later.',
              });
            }
          });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({
          error: 'The server is out for lunch, please try again later.',
        });
      })      
  }
};


exports.signin = (req, res) => {
  // Get the ID token passed and the CSRF token.
  
  const idToken = req.body.idToken;
  // const csrfToken = req.body.csrfToken;
  // Guard against CSRF attacks.
  // console.log('the csrfToke: ', csrfToken);
  // console.log(req.cookies.csrfToken, 'the cookie');

  // if (csrfToken !== req.cookies.csrfToken) {
  //   res.status(401).send('UNAUTHORIZED REQUEST!');
  // }

  // Set session expiration to 7 days.
  const expiresIn = 60 * 60 * 24 * 7 * 1000;
  // Create the session cookie. This will also verify the ID token in the process.
  // The session cookie will have the same claims as the ID token.
  // To only allow session cookie setting on recent sign-in, auth_time in ID token
  // can be checked to ensure user was recently signed in before creating a session cookie.

  defaultAuth
    .verifyIdToken(idToken)
    .then((decodedIdToken) => {
      // Only process if the user just signed in in the last 5 minutes.
      if (new Date().getTime() / 1000 - decodedIdToken.auth_time < 5 * 60) {
        // Create session cookie and set it.
        return defaultAuth
          .createSessionCookie(idToken, { expiresIn })
          .then(
            (sessionCookie) => {
              // Set cookie policy for session cookie.
              const options = {
                maxAge: expiresIn,
                httpOnly: true,
                secure: true,
              };
              res.cookie('session', sessionCookie, options);
              res.end(JSON.stringify({ status: 'success', session: sessionCookie }));
            },
            (_error) => {
              res.status(401).send('UNAUTHORIZED REQUEST!');
            }
          );
      }
      // A user that was not recently signed in is trying to set a session cookie.
      // To guard against ID token theft, require re-authentication.
      res.status(401).send('Recent sign in required!');
    });
};


exports.logout = (req, res) => {
  res.clearCookie('session');
  // res.redirect('/login');
  res.status(201).send('You are logged out!');
}

exports.getDigitalCV = (req, res) => {
  db.collection(`users/${req.params.userId}/digital-cv`)
    .get()
    .then((data) => {
      let cvData = [];
      data.forEach((doc) => {
        cvData.push(doc.data());
      });
      return res.json(cvData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong please try again.' });
    });
}

exports.getMyDigitalCV = (req, res) => {
  db.collection(`users/${req.user.userId}/digital-cv`)
    .get()
    .then((data) => {
      let cvData = [];
      data.forEach((doc) => {
        cvData.push(doc.data());
      });
      return res.json(cvData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong please try again.' });
    });
};