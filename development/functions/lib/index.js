const config = require('../utils/database');
const client = require('@sendgrid/client');
client.setApiKey(config.sendgridApi)

async function addToSendgrid(data) {
  // const data = {
  //   list_ids: ['e5ad3bb1-b361-47de-9fa3-a900234ed6f0'],
  //   contacts: [
  //     {
  //       email: 'mikephelps@young.com',
  //       first_name: 'Mike',
  //       last_name: 'Phelps',
  //       unique_name: 'mikephelps',
  //       custom_fields: {
  //         e8_T: 'www.test.com',
  //         // mobile: '9.5',
  //         // username: 'machine gun kelly',
  //         // fullname: 'Fucking Legends',
  //       },
  //     },
  //   ],
  // };

  const request = {
    url: `${config.sendGridBaseURL}/v3/marketing/contacts`,
    method: 'PUT',
    body: data,
  };
  client
    .request(request)
    .then(([response, _body]) => {
      console.log('the status code: ', response.statusCode);
      console.log('the response.body: ', response.body);
      return response;
    })
    .catch((error) => {
      console.error(error.response.body);
    });
}

// async function addOrganisationToSendgrid () {
//    const data = {
//      name: 'gender',
//      field_type: 'Text',
//    };

//    const request = {
//      url: `${config.sendGridBaseURL}/v3/marketing/field_definitions`,
//      method: 'POST',
//      body: data,
//    };

//    client
//      .request(request)
//      .then(([response, body]) => {
//        console.log(response.statusCode);
//        console.log(response.body);
//        return { response, body };
//      })
//      .catch((error) => {
//        console.error(error.response.body);
//      }); 
// }

async function addCustomFieldToSendgrid() {
  const data = {
    name: 'gender',
    field_type: 'Text',
  };

  const request = {
    url: `${config.sendGridBaseURL}/v3/marketing/field_definitions`,
    method: 'POST',
    body: data,
  };

  client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body);
      return { response, body };
    })
    .catch((error) => {
      console.error(error.response.body);
    });
}

// addOrganisationToSendgrid();
// addToSendgrid();
// addCustomFieldToSendgrid();

module.exports = { addToSendgrid };