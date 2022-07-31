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

module.exports = { admin, db, defaultAuth, firebase, dayjs };
