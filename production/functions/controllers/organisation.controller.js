const { admin, db, firebase, defaultAuth } = require('../utils/admin');
const config = require('../utils/database');
const { v4: uuidv4 } = require('uuid');
const sgMail = require('@sendgrid/mail');
const request = require('request');

const {
  validateOrgSignupData,
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
                const orgData = {
                  userReference: db.doc(`/users/${userId}`),
                };
                db.doc(`organisations/${userId}`).set(orgData);
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