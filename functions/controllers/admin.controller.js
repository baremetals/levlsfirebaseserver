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

exports.adminLongin = (req, res) => {
    const user = {
      email: req.body.email,
      password: req.body.password,
    };
  
    const { valid, errors } = validateLoginData(user);
  
    if (!valid) return res.status(400).json(errors);
  
    firebase
      .auth()
      .getUserByEmail(user.email)
      .then((userRecord) => {
        if (userRecord.isAdmin != false) {
          return firebase.auth()
            .signInWithEmailAndPassword(user.email, user.password)
            .then((data) => {
            return data.user.getIdToken();
            })
            .then((token) => {
            return res.json({ token });
             })
            .catch((err) => {
            console.error(err);
            return res
             .status(403)
             .json({ general: "This Route Doesn't exist" });
            });
        }
      })
      .catch((err) => {
        console.error(err);
        return res
          .status(403)
          .json({ general: "This Route Doesn't exist" });
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