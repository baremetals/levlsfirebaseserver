const { admin, db, firebase, defaultAuth, dayjs } = require('../utils/admin');
// const config = require('../utils/database');
// const { v4 } = require('uuid');
// const sgMail = require('@sendgrid/mail');
// const request = require('request');


db.collection('users')
  .where('isActive', '==', false)
  .where('verified', '==', false)
  .get()
  .then(async (data) => {
    data.docs.forEach(async (doc) => {
     await db.doc(`users/${doc.data().userId}`).update({
       isActive: true,
       verified: true,
     });
     await db
       .doc(`/usernames/${doc.data().username}`)
       .update({ isActive: true });
     return console.log({ success: 'done geeza' });
    });
  })
  .catch((err) => {
    console.error(err);
  });