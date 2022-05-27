// const companyLogo = ''
const admin = require('firebase-admin');

var serviceAccount = require('../justappli-b9f5c-firebase-adminsdk-pmqeu-3a659971bc.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

const db = admin.firestore();



module.exports = { admin, db };