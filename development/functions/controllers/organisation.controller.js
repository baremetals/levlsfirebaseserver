const { admin, db, firebase, defaultAuth } = require('../utils/admin');
const config = require('../utils/database');
const { v4 } = require('uuid');
const sgMail = require('@sendgrid/mail');
const request = require('request');

const {
  validateOrgSignupData,
  validateSignupData,
  validateEmailData,
  validatePasswordChange,
  reduceOrganisationDetails,
} = require('../utils/validators');

// Organisation Registration
exports.register = (req, res) => {
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
    subject: `New organisation sign up - ${req.body.company_name}`,
    text: `${req.body.company_name}, just created an account`,
    html: `
        <h3> Hello Admin </h3>
        <p>A new 'Organisation created an account.</p>
        <p>Thank You.</p>
        <p>LEVLS</p>
      `,
  };

  const newOrg = {
    username: req.body.username,
    fullname: req.body.fullname,
    organisationName: req.body.company_name,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.password,
    userType: 'Organisation',
    industry: req.body.company_industry,
    organisationType: req.body.company_type,
    website: req.body.website,
    referral:
      req.body.hear_from === 'Other'
        ? req.body.hear_from_other
        : req.body.hear_from,
    purpose:
      req.body.achieve === 'Other'
        ? req.body.achieve_from_other
        : req.body.achieve,
    registrationNumber: req.body.registration_number,
    deviceToken: req.body.deviceToken || '',
    signUpCode: req.body.signUpCode || '',
    acceptedTerms: true,
  };

  const { valid, errors } = validateOrgSignupData(newOrg);
  const noImg = 'default.jpg';
  const bkgImage = 'background.jpg';
  let userId, uid;

  if (!valid) {
    return res.status(400).json(errors);
  } else {
    db.collection('usernames')
      .doc(`${newOrg.username}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          return res.status(400).json({ error: 'username is already in use' });
        }
      })
      .then(() => {
        defaultAuth
          .createUser({
            email: newOrg.email,
            emailVerified: false,
            password: newOrg.password,
            displayName: newOrg.username,
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
              fullname: newOrg.fullname,
              organisationName: newOrg.organisationName,
              username: newOrg.username,
              email: newOrg.email,
              mobile: '',
              imageUrl: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/${noImg}?alt=media&token=${config.defaultimgtoken}`,
              backgroundImage: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/${bkgImage}?alt=media&token=${config.defaultbkimgtoken}`,
              userId,
              bio: '',
              website: newOrg.website,
              slogan: '',
              founded: '',
              industry: newOrg.industry,
              companySize: '',
              organisationType: newOrg.organisationType,
              numberOrname: '',
              street: '',
              city: 'London',
              country: 'England',
              postcode: '',
              followersCount: 0,
              followingCount: 0,
              userType: newOrg.userType,
              isAdmin: false,
              verified: false,
              acceptedTerms: true,
              isActive: false,
              isPartner: false,
              deviceToken: newOrg.deviceToken,
              instagram: '',
              tiktok: '',
              twitter: '',
              linkedIn: '',
              profileUrl: '',
              signUpCode: newOrg.signUpCode,
              referral: newOrg.referral,
              purpose: newOrg.purpose,
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
              .doc(`${newOrg.username}`)
              .set({
                uid,
                createdAt: new Date().toISOString(),
                imageUrl: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/${noImg}?alt=media&token=${config.defaultimgtoken}`,
                organisationName: '',
                isActive: false,
              })
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
              });
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
          error: 'The server is out for lunch again, please try again later.',
        });
      });
  }
};

/*
  This function buys a plan and sets the users subscription and claims
*/
exports.buyPlan = (req, res) => {
  const days = req.body.plan === 'premium' ? 35 : 21;
  const extraDays = days + 5;
  const totalUsers = req.body.plan === 'premium' ? 2 : 1;
  const claims = {
    premium: true,
    premiumStartDate: new Date().toISOString(), // start date
    premiumExpiryDate: 60 * 60 * 24 * days * 1000, // req.body.expiryDate
    accountType: 'parent',
    totalUsersAllowed: req.user.totalUsersAllowed
      ? req.user.totalUsersAllowed + totalUsers
      : totalUsers,
    currentUsers: req.user.currentUsers
      ? req.user.currentUsers
      : [req.user.userId],
    revokeAccessDate: 60 * 60 * 24 * extraDays * 1000, // req.body.revokeAccessDate
    role: ['owner'],
    permissions: ['All'],
    listings: req.user.listings
      ? req.body.list.forEach((ls) => req.user.listings.concat(ls)) // req.user.listings.concat(req.body.list)
      : [req.body.list],
  };

  const planDetails = {
    paymentOption: req.body.paymentOption,
    plan: req.body.plan,
    planId: req.body.planId,
    price: req.body.price,
    totalCost: req.body.totalCost,
    status: 'unpaid',
    createdAt: new Date().toISOString(),
    updateAt: new Date().toISOString(),
  };

  const subDetails = {
    organisationName: 'testing limited',
    organisationId: req.user.userId,
    paymentOption: req.body.paymentOption,
    price: req.body.price,
    totalCost: req.body.totalCost,
    status: 'unpaid',
    premiumStartDate: new Date().toISOString(),
    premiumExpiryDate: 60 * 60 * 24 * days * 1000,
    totalUsersAllowed: totalUsers,
    currentUsers: [req.user.userId],
    revokeAccessDate: 60 * 60 * 24 * extraDays * 1000,
    listing: req.body.listing,
    createdAt: new Date().toISOString(),
    updateAt: new Date().toISOString(),
  };
  db.collection(`/users/${req.user.userId}/checkout_sessions`)
    .add(planDetails)
    .then(async () => {
      db.collection(`subscriptions`)
        .add({
          ...subDetails,
        })
        .then(async (doc) => {
          // console.log(doc);
          return db
            .doc(`subscriptions/${doc.id}/account-users/${req.user.userId}`)
            .set({
              name: req.user.fullname,
              roles: ['owner'],
              subsId: doc.id,
              accountType: 'parent',
              permissions: ['All'],
            });
        });
    })
    .then(async () => {
      await defaultAuth.setCustomUserClaims(req.user.userId, claims);
      await db.doc(`/users/${req.user.userId}`).update({
        premuimRole: ['owner'],
        accountType: 'parent',
        totalUsersAllowed: claims.totalUsersAllowed,
        currentUsers: claims.currentUsers,
      });
      return res.status(201).json({ success: 'Thanks for your purchase' });
    })
    .catch((error) => {
      console.log(error);
    });
};

/* 
  This function adds a team member to the organisation. 
  This feature is only used when an organisation purchase a monthly add and above.
*/
exports.addUser = (req, res) => {
  const totalCurrentUsers = req.user.currentUsers.length;
  const totalallowedUsers = req.user.totalUsersAllowed;

  if (totalCurrentUsers >= totalallowedUsers) {
    return res
      .status(401)
      .json({ error: 'You have reached the maximum users allowed.' });
  }

  const increment = admin.firestore.FieldValue.increment(1);
  const inActiveUsersRef = db.collection('site stats').doc('inactive-users');
  const totalUsersRef = db.collection('site stats').doc('all-users');
  const batch = db.batch();

  const adminMsg = {
    to: 'admin@levls.io', // recipient
    from: 'LEVLS. <noreply@levls.io>',
    subject: `Test user sign up - ${req.body.username}`,
    text: `${req.body.username}, just created an account`,
    html: `
        <h3> Hello Admin </h3>
        <p>You have a new ${req.body.userType || 'Personal'} user.</p>
        <p>Thank You.</p>
        <p>LEVLS</p>
      `,
  };

  // const childrenColl = db.collection(
  //   `/users/${req.user.userId}/children-accounts/`
  // );

  const username =
    req.body.firstName + '-' + req.body.lastName + '-' + v4().slice(0, 5);

  const password = 'temp' + v4().slice(0, 5);

  const claims = {
    premium: true,
    // premiumStartDate: req.user.premiumStartDate,
    // premiumExpiryDate: req.user.premiumExpiryDate,
    accountType: 'child',
    totalUsersAllowed: req.user.totalUsersAllowed,
    // revokeAccessDate: req.user.revokeAccessDate,
    // plan: req.body.plan,
    // planId: req.body.planId,
    role: req.body.role,
    permissions: req.body.permissions,
    parentName: 'testcompany ltd',
    parentId: req.user.userId,
  };

  const teamMember = {
    ...claims,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    fullname: req.body.firstName + ' ' + req.body.lastName,
    username,
    dateOfBirth: '14/09/1994',
    email: req.body.email,
    password,
    confirmPassword: password,
    userType: 'Personal',
    occupation: req.body.occupation,
    verified: false,
    acceptedTerms: true,
    isActive: false,
    city: 'London',
    country: 'England',
    followersCount: 0,
    followingCount: 0,
  };

  const { valid, errors } = validateSignupData(teamMember);
  const noImg = 'default.jpg';
  const bkgImage = 'background.jpg';
  let userId, uid;

  if (!valid) {
    return res.status(400).json(errors);
  }

  defaultAuth
    .getUserByEmail(req.body.email)
    .then(async (user) => {
      const inviteEmail = {
        to: 'admin@levls.io', // recipient
        from: 'LEVLS. <noreply@levls.io>',
        subject: `Test user sign up - ${req.body.username}`,
        text: `${req.body.username}, just created an account`,
        html: `
        <h3> Hello Admin </h3>
        <p>You have a new ${req.body.userType || 'Personal'} user.</p>
        <p>Thank You.</p>
        <p>LEVLS</p>
      `,
      };
      // defaultAuth.update(user.uid, {disabled: false})
      await defaultAuth.setCustomUserClaims(user.uid, claims);
      await db.doc(`/users/${req.user.userId}`).update({
        currentUsers: req.user.currentUsers.concat(user.uid),
        updatedAt: new Date().toISOString(),
      });
      await sgMail.send(inviteEmail);
      return res
        .status(201)
        .json({ success: 'The user account has been created.' });
    })
    // .then(async () => {
    //   db.collection('usernames')
    //     .doc(username)
    //     .get()
    //     .then((doc) => {
    //       if (doc.exists) {
    //         return res
    //           .status(400)
    //           .json({ error: 'username is already in use' });
    //       }
    //       defaultAuth
    //         .createUser({
    //           email: teamMember.email,
    //           emailVerified: false,
    //           password: teamMember.password,
    //           displayName: username,
    //           disabled: false,
    //         })
    //         .then(async (userRecord) => {
    //           await defaultAuth.setCustomUserClaims(userRecord.uid, claims);
    //           userId = userRecord.uid;
    //           uid = userRecord.uid;
    //         })
    //         .then(async () => {
    //           const userCredentials = {
    //             ...teamMember,
    //             createdAt: new Date().toISOString(),
    //             updatedAt: new Date().toISOString(),
    //             imageUrl: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/${noImg}?alt=media&token=${config.defaultimgtoken}`,
    //             backgroundImage: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/${bkgImage}?alt=media&token=${config.defaultbkimgtoken}`,
    //             userId,
    //           };
    //           await db.doc(`/users/${userId}`).set(userCredentials);
    //           await db
    //             .doc(`users/${userId}/followings/${config.levlsUserId}`)
    //             .set({
    //               createdAt: new Date().toISOString(),
    //               followedUserId: config.levlsUserId,
    //               followedUserImageUrl: config.levlsLogoUrl,
    //               followedUserUsername: 'levls',
    //               followedUserBkImage: config.levlsBkImage,
    //               followedUserCity: 'London',
    //               followedUserCountry: 'UK',
    //               followedUserOccupationOrIndustry: 'Technology',
    //             });
    //           await db.doc(`/users/${req.user.userId}`).update({
    //             currentUsers: req.user.currentUsers.concat(userRecord.uid),
    //             updatedAt: new Date().toISOString(),
    //           });
    //           return db
    //             .collection('usernames')
    //             .doc(`${newUser.username}`)
    //             .set({
    //               uid,
    //               createdAt: new Date().toISOString(),
    //               imageUrl: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/${noImg}?alt=media&token=${config.defaultimgtoken}`,
    //               fullname: '',
    //               isActive: false,
    //             })
    //             .then(() => {
    //               batch.set(
    //                 totalUsersRef,
    //                 { totalCount: increment },
    //                 { merge: true }
    //               );
    //               batch.set(
    //                 inActiveUsersRef,
    //                 { totalCount: increment },
    //                 { merge: true }
    //               );
    //               batch.commit();
    //             })
    //             .then(async () => {
    //               await sgMail.send(adminMsg);
    //               return res
    //                 .status(201)
    //                 .json({ success: 'The user account has been created.' });
    //             })
    //             .catch((err) => {
    //               console.error(err);
    //               return res.status(500).json({
    //                 error:
    //                   'The server is out for lunch, please try again later. test',
    //               });
    //             });
    //         });
    //     })
    //     .catch((err) => {
    //       console.error(err);
    //       if (err.code === 'auth/email-already-exists') {
    //         return res.status(400).json({ error: 'Email is already in use' });
    //       } else {
    //         return res.status(500).json({
    //           error: 'The server is out for lunch, please try again later. wavey test',
    //         });
    //       }
    //     });
    // })
    .catch((err) => {
      if (err.code === 'auth/user-not-found') {
        db.collection('usernames')
          .doc(username)
          .get()
          .then((doc) => {
            if (doc.exists) {
              return res
                .status(400)
                .json({ error: 'username is already in use' });
            }
            defaultAuth
              .createUser({
                email: teamMember.email,
                emailVerified: false,
                password: teamMember.password,
                displayName: username,
                disabled: false,
              })
              .then(async (userRecord) => {
                await defaultAuth.setCustomUserClaims(userRecord.uid, claims);
                userId = userRecord.uid;
                uid = userRecord.uid;
              })
              .then(async () => {
                await db.doc(`/users/${userId}`).set({
                  ...teamMember,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  imageUrl: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/${noImg}?alt=media&token=${config.defaultimgtoken}`,
                  backgroundImage: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/${bkgImage}?alt=media&token=${config.defaultbkimgtoken}`,
                  userId,
                });
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
                await db.doc(`/users/${req.user.userId}`).update({
                  currentUsers: req.user.currentUsers.concat(uid),
                  updatedAt: new Date().toISOString(),
                });
                return db
                  .collection('usernames')
                  .doc(`${username}`)
                  .set({
                    uid,
                    createdAt: new Date().toISOString(),
                    imageUrl: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/${noImg}?alt=media&token=${config.defaultimgtoken}`,
                    fullname: '',
                    isActive: false,
                  })
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
                    batch.commit();
                  })
                  .then(async () => {
                    await sgMail.send(adminMsg);
                    return res
                      .status(201)
                      .json({ success: 'The user account has been created.' });
                  })
                  .catch((er) => {
                    console.error(er);
                    return res.status(500).json({
                      error:
                        'The server is out for lunch, please try again later. test',
                    });
                  });
              });
          })
          .catch((err) => {
            console.error(err);
            if (err.code === 'auth/email-already-exists') {
              return res.status(400).json({ error: 'Email is already in use' });
            } else {
              return res.status(500).json({
                error:
                  'The server is out for lunch, please try again later. wavey test',
              });
            }
          });
      } else {
        return res.status(500).json({
          error:
            'The server is out for lunch, please try again later. yooo test',
        });
      }
    });
};

// exports.removeUser = (req, res) => {

//   const removedUserDoc = db.doc(`/users/${req.params.userId}`)

//   const claims = {
//     premium: false,
//     // premiumStartDate: req.user.premiumStartDate,
//     // premiumExpiryDate: req.user.premiumExpiryDate,
//     // accountType: 'child',
//     // totalUsersAllowed: req.user.totalUsersAllowed,
//     // revokeAccessDate: req.user.revokeAccessDate,
//     // plan: req.body.plan,
//     // planId: req.body.planId,
//     // premuimRole: [req.body.roles],
//     // parentName: req.user.organisationName,
//     // parentId: req.user.userId,
//   };

//   db.doc(`/users/${req.user.userId}`).update({
//     currentUsers: req.user.currentUsers.concat(userRecord.uid),
//     updatedAt: new Date().toISOString(),
//   })
//   .then(() => {})

//             defaultAuth
//           .createUser({
//             email: teamMember.email,
//             emailVerified: false,
//             password: teamMember.password,
//             displayName: teamMember.username,
//             disabled: false,
//           })
//           .then(async (userRecord) => {
//             await defaultAuth.setCustomUserClaims(userRecord.uid, {
//               ...claims,
//               currentUsers: req.user.currentUsers.concat(userRecord.uid),
//             });
//             userId = userRecord.uid;
//             uid = userRecord.uid;
//           })

// }

/** 
  This function invites a non-organisation team meber to manage its services. 
  This feature is only used when an organisation purchase a monthly add and above.
  This can used for collaboration amongst companies
*/
exports.inviteUser = (req, res) => {
  const inviteUserDoc = db.doc(`/users/${req.body.userId}`);

  const orgUsers = db.collection(
    `/users/${req.user.userId}/children-accounts/`
  );

  orgUsers.get().then((children) => {
    if (children.length === 5) {
      return res.status(400).json({
        error: 'You have reached the maximum users allowed.',
      });
    }
  });

  inviteUserDoc
    .get()
    .then(async (usrDoc) => {
      await orgUsers.doc(req.body.userId).set(usrDoc.data());
      console.log(usrDoc.data());
      return res.status(201).json({ usrDoc });
    })
    .catch((err) => {
      console.log(err);
    });

  // let userId, uid;

  // console.log(req.user)
  // const adminMsg = {
  //   to: 'admin@levls.io', // recipient
  //   from: 'LEVLS. <noreply@levls.io>',
  //   subject: `Test user sign up - ${req.body.username}`,
  //   text: `${req.body.username}, just created an account`,
  //   html: `
  //       <h3> Hello Admin </h3>
  //       <p>You have a new ${req.body.userType || 'Personal'} user.</p>
  //       <p>Thank You.</p>
  //       <p>LEVLS</p>
  //     `,
  // };

  // const invitedUserDoc = db.doc(`/users/${userId}`);

  // const invitedUser = {
  //   company: req.body.companyName,
  //   lastName: req.body.lastName,
  //   email: req.body.email,
  //   userType: req.body.userType || 'Personal',
  //   parent: req.user.organisationName,
  //   accountType: 'child',
  //   accessLevel: ['apprenticeships', 'candidates', 'Editor'],
  // };

  // defaultAuth.getUser(req.body.userId).then((user) => {
  //   console.log('this the invited user: ', user);
  //   return
  // })
};
