const admin = require('firebase-admin');
const firebase = require('firebase');
const config = require('./database');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const serviceAccount = require('../pandabares-testbed-firebase-adminsdk-s2moh-17fc27619a.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
firebase.initializeApp(config);

const db = admin.firestore();
const defaultAuth = admin.auth();

// const test = '2022-05-28T17:29:37.285Z'; //new Date().toISOString()
// const parsedTime = Date.parse(test)
// const d = new Date() //.getTime();
// // console.log(d)
// const diff = d - parsedTime;
// console.log(new Date(diff));
// // console.log(new Date().getTime() - parsedTime);
// console.log(dayjs(test).fromNow());

// const date1 = dayjs(test);
// const date2 = dayjs(d);
// console.log(date2.diff(date1, 'hour'));

// const date1 = dayjs('2019-01-25');
// const date2 = dayjs('2018-06-05');
// console.log(date1.diff(date2, 'minute'));



module.exports = { admin, db, defaultAuth, firebase, dayjs };