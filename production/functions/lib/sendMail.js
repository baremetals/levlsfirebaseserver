const { admin, db, firebase, defaultAuth, dayjs } = require('../utils/admin');
const config = require('../utils/database');
const { v4 } = require('uuid');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(config.sendgridApi);


// db.collection('apprenticeships')
//   .get()
//   .then(async (data) => {
//     data.docs.forEach(async (doc) => {
//       await db
//         .collection(`apprenticeships/${doc.id}/submissions`)
//         .get()
//         .then(async (sub) => {
//             if (sub.docs.length > 0) {
//                 sub.docs
//                   .forEach(async (dc) => {
//                     // console.log(dc.id)
//                    await db.doc(
//                       `users/${dc.id}/applications/${
//                         dc.data().apprenticeshipId
//                       }`
//                     )
//                       .set({ ...dc.data() })
//                       .catch((err) => {
//                         console.error(err);
//                       });
//                   })
                  
//             }
//         });
//       return console.log({ success: 'done geeza' });
//     });
//   })
//   .catch((err) => {
//     console.error(err);
//   });

db.collection('users')
  // .where('isActive', '==', false)
  .where('userType', '==', 'Personal')
  .get()
  .then(async (data) => {
    data.docs.forEach(async (doc) => {
        await db
          .collection(`users/${doc.id}/applications`)
          .get()
          .then(async (apps) => {
            if (apps.docs.length < 1) {
                const msg = {
                  to: `${doc.data().email}`, // recipient
                  from: 'LEVLS. <noreply@levls.io>', // Change to verified sender
                  template_id: 'd-fa4f7911451543ee9476293a77d3cf03',
                };

                await sgMail
                  .send(msg)
                  .then(() => console.log('Email sent'))
                  .catch((err) => {
                    console.error(err);
                  });
            }
          });
    });
  })
  .catch((err) => {
    console.error(err);
  });