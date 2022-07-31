// const companyLogo = ''
const admin = require('firebase-admin');
const firebase = require('firebase');
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


module.exports = { admin, db, defaultAuth, firebase, dayjs };
