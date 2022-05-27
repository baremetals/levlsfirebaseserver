const admin = require('firebase-admin');

var serviceAccount = require('../pandabares-testbed-firebase-adminsdk-s2moh-17fc27619a.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const defaultAuth = admin.auth();

module.exports = { admin, db, defaultAuth };