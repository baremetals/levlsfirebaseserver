const config = require('../utils/database');
const client = require('@sendgrid/client');
const axios = require('axios');
client.setApiKey(config.sendgridApi);

async function addToSendgrid(data) {
  const request = {
    url: `${config.sendGridBaseURL}/v3/marketing/contacts`,
    method: 'PUT',
    body: data,
  };
  client
    .request(request)
    .then(([response, _body]) => {
      return response;
    })
    .catch((error) => {
      console.error(error.response.body);
    });
}

async function addUserToStrapi(user) {

  await axios({
    method: 'POST',
    url: `${config.strapiApi}/candidates`,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.strapiJwtToken}`,
    },
    data: {
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        pronouns: null,
        username: user.username,
        occupation: null,
        dateOfbirth: user.dateOfBirth,
        email: user.email,
        mobile: null,
        gender: null,
        imageUrl: user.imageUrl,
        backgroundImage: user.backgroundImage,
        userId: user.userId,
        bio: null,
        CV: null,
        website: null,
        slogan: null,
        numberOrname: null,
        street: null,
        city: 'London',
        country: 'England',
        postcode: null,
        followersCount: 0,
        followingCount: 0,
        userType: 'Personal',
        verified: false,
        isActive: false,
        deviceToken: user.deviceToken,
        instagram: null,
        tiktok: null,
        twitter: null,
        linkedIn: null,
        profileUrl: null,
        signUpCode: user.signUpCode || null,
        isCvPrivate: true,
      },
    },
  }).then(() => {
    return 'done';
  })
  .catch((err) => {
    console.log('This is the error: ', err);
  })
}


module.exports = { addToSendgrid, addUserToStrapi };
