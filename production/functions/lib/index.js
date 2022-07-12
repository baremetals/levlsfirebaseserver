const config = require('../utils/database');
const client = require('@sendgrid/client');
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
module.exports = { addToSendgrid };
