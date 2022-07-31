// const firebase = require('@firebase/testing');
const { admin, db } = require('../../utils/admin');
const config = require('../../utils/database');
const { uuid } = require('uuidv4');
const sgMail = require('@sendgrid/mail');
const axios = require('axios');



const projectId = "testfirebaseemulators"
// process.env.GCLOUD_PROJECT = projectId
// process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
// let app = admin.initializeApp({projectId})
// let db = firebase.firestore(app)
const baseUrl = `http://localhost:9090/${config.projectId}/europe-west2/api`;


// beforeAll(async () => {
//   await firebase.clearFirestoreData({ projectId });
// });

describe('Register a new user', () => {
  it('should register a new user', async () => {
    const userDoc = {
      firstName: 'King',
      lastName: 'Has',
      username: 'kingh2',
      dateOfBirth: '01/11/1985',
      email: 'kingh2@mexcool.com',
      password: 'monkey00',
      confirmPassword: 'monkey00',
      signUpCode: '',
    };

    const res = await axios.post(`${baseUrl}/signup`, userDoc);
    // const res = await axios.get(`${baseUrl}/usernames`,);

    expect(res.statusCode).toEqual(201);
    expect(res.json);
  });
});
