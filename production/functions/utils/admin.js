// const companyLogo = ''
const admin = require('firebase-admin');
const firebase = require('firebase');
// const request = require('request');
// const sgMail = require('@sendgrid/mail');
const config = require('./database');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const serviceAccount = require('../justappli-b9f5c-firebase-adminsdk-pmqeu-3a659971bc.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
firebase.initializeApp(config);

const db = admin.firestore();
const defaultAuth = admin.auth();

// db.collection('mobile timeline')
//   .where('contentType', '==', 'upload')
//   .get()
//   .then(async (data) => {
//     // console.log(data.docs[0].fieldsProto);
//     // console.log(data.docs[0].data());
//     data.docs.forEach(async (doc) => {
//       // if (!doc.data().uploadId) {
//       //   await db
//       //     .doc(`news/${doc.id}`)
//       //     .update({
//       //       timelineId: doc.id,
//       //       pageUrl: `news-articles/${doc.data().category.toLowerCase()}/${
//       //         doc.data().slug
//       //       }`,
//       //     });
//       // }
//       await db.doc(`mobile timeline/${doc.data().timelineId}`).update({
//         pageUrl: `upload/${doc.data().timelineId}`,
//       });
//       return console.log({ success: 'done geeza' });
//     });
//   })
//   .catch((err) => {
//     console.error(err);
//   });
// db.collection('users')
//   .where('isActive', '==', false)
//   .where('verified', '==', false)
//   .get()
//   .then(async (data) => {
//     data.docs.forEach(async (doc) => {
//       const userLink = `https://levls.io/profile/${doc.data().userId}`;
//       let options = {
//         method: 'POST',
//         url: `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${config.apiKey}`,
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           dynamicLinkInfo: {
//             domainUriPrefix: 'https://levlsapp.page.link',
//             link: userLink,
//             androidInfo: {
//               androidPackageName: 'com.pandabares.justappli',
//             },
//           },
//         }),
//       };
//       request(options, async function (error, response) {
//         if (error) throw new Error(error);
//         const dta = JSON.parse(response.body);
//         // console.log(data)
//         const profileUrl = dta.shortLink ? dta.shortLink : userLink;
//         await db.doc(`users/${doc.data().userId}`).update({
//           profileUrl,
//         });
        
//       });
//     });
//   })
//   .catch((err) => {
//     console.error(err);
//   });

// db.doc(`opportunities/6yHwheP4LlhNe7zDfe1Z`).get().then(async (doc) => {
//   if (doc.exists) {
//     await db.doc(`mobile timeline/6yHwheP4LlhNe7zDfe1Z`).get().then(async (dc) => {
//       if (!dc.exists) {
//         // console.log(doc.data())
//         await db.doc('mobile timeline/6yHwheP4LlhNe7zDfe1Z').set(doc.data());
//       }
//     })
//   }
// })
// .catch((err) => {
//   console.error(err);
// })

//   });

module.exports = { admin, db, defaultAuth, firebase, dayjs };
