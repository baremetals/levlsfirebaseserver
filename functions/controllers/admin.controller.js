const { admin, db } = require("../utils/admin");
const sgMail = require('@sendgrid/mail')
const config = require("../utils/database");
const { v4: uuidv4 } = require('uuid');


const firebase = require("firebase");
// firebase.initializeApp(config);

const {
    // validateSignupData,
    validateLoginData,
    // reduceUserDetails,
    // validateEmailData,
    // validatePasswordChange
} = require("../utils/validators");

exports.adminLogin = (req, res) => {
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
        if (data) {;
          data.forEach((doc) => {
            userDoc = doc.data();
          });
          return userDoc;
        }
      })
      .then(() => {
        if (userDoc.verified !== true) {
          return res.status(403).json({
            error:
              'Please activate this account, check your email for the activation link.',
          });
        } else {
          if (userDoc.isAdmin === true) {;
            return firebase
              .auth()
              .signInWithEmailAndPassword(user.email, user.password)
              .then((data) => {
                return data.user.getIdToken();
              })
              .then((token) => {;
                return res.json({ token });
              })
              .catch((err) => {;
                console.error(err);
                if (err.code.startsWith('auth')) {
                  return res.status(403).json({
                    error: 'wrong email or password, please try again',
                  });
                } else {
                  return res
                    .status(403)
                    .json({ error: 'wrong credentials, please try again' });
                }
              });
          } else {
            return res
              .status(403)
              .json({ error: 'Yo do not have the right permission to access this route!' });
          }
        }
      })
      .catch((err) => {
        console.error(err);
        return res
          .status(403)
          .json({ general: "Sorry Something Went Wrong" });
      });
};

// Get Admin user details
exports.getAdminUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.userId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return res.json(userData);
      }
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.contactUs = (req, res) => {
  const contact = {
    name: req.body.name,
    email: req.body.email,
    enquiry: req.body.enquiry,
    comment: req.body.comment
  }

  // db.collection('contact us').add(contact)

    const msg = {
      to: `${contact.email}`, // recipient
      from: 'noreply@levls.io', // Change to verified sender
      subject: 'Contact us',
      text: 'We received your message.',
      html: `
        <h3> Hello ${contact.name} </h3>
        <p>Thank you for reaching out. ...</p>
        <p>We endeavour to get back to you within 48 hours.</p>
        <p>Thank You.</p>
        <p>LEVLS Team</p>
      `,
    };
    sgMail
      .send(msg)
      .then(() => {        
        console.log('Email sent')
        return res.status(201).json({ success: 'email was sent successfully' })
      })
      .catch((error) => {
        console.error(error)
      })
}