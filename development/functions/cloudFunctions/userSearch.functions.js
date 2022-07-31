const functions = require("firebase-functions");
const algoliasearch = require('algoliasearch');
const config = require("../utils/database")

// const ALGOLIA_ID = functions.config().algolia.app_id || config.ALGOLIA_ID;
// const ALGOLIA_ADMIN_KEY = functions.config().algolia.api_key || config.ALGOLIA_ADMIN_KEY;
const ALGOLIA_ID = config.ALGOLIA_ID;
const ALGOLIA_ADMIN_KEY = config.ALGOLIA_ADMIN_KEY;
const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
const ALGOLIA_INDEX_NAME = 'users';


//users
exports.addToIndex = functions
.region('europe-west2')
.firestore.document('users/{id}')
.onCreate((snap, _context) => {
  const user = {
    userId: snap.data().userId, 
    imageUrl: snap.data().imageUrl,
    isActive: snap.data().isActive,
    username: snap.data().username,
    fullname: snap.data().fullname,
    organisationName: snap.data().organisationName,
  };
  user.objectID = user.userId;
  const index = client.initIndex(ALGOLIA_INDEX_NAME);
  return index.saveObject(user);
})

exports.updateIndex = functions
.region('europe-west2')
.firestore.document('users/{id}')
.onUpdate((change) => {
  const newData = change.after.data();
  newData.objectID = newData.userId;
  const index = client.initIndex(ALGOLIA_INDEX_NAME);
  return index.saveObject(newData);
})

exports.deleteIndex = functions
.region('europe-west2')
.firestore.document('users/{id}')
.onDelete((snap) => {
  const index = client.initIndex('users');
  index.deleteObject(snap.id);
})

// Opportunities
exports.addToOpportunitiesIndex = functions
.region('europe-west2')
.firestore.document('opportunities/{id}')
.onCreate((snap, _context) => {
  const data = snap.data()
  data.objectID = snap.id;
  data.createdAtAsTimestamp = Date.parse(data.createdAt)
  const index = client.initIndex('opportunities');
  return index.saveObject(data);
})


exports.updateOpportunitiesIndex = functions
.region('europe-west2')
.firestore.document('opportunities/{id}')
.onUpdate((change, _snap) => {
  const index = client.initIndex('opportunities');
  const newData = change.after.data();
  newData.objectID = newData.opportunityId;
  newData.createdAtAsTimestamp = Date.parse(newData.createdAt)
  return index.saveObject(newData);
})


exports.deleteOpportunitiesIndex = functions
.region('europe-west2')
.firestore.document('opportunities/{id}')
.onDelete((snap) => {
  const index = client.initIndex('opportunities');
  index.deleteObject(snap.id);
})

// Events
exports.addToEventsIndex = functions
.region('europe-west2')
.firestore.document('events/{id}')
.onCreate((snap, _context) => {
  const data = snap.data()
  data.objectID = snap.id;
  data.createdAtAsTimestamp = Date.parse(data.createdAt)
  const index = client.initIndex('events');
  return index.saveObject(data);
})

exports.updateEventsIndex = functions
.region('europe-west2')
.firestore.document('events/{id}')
.onUpdate((change) => {
  const newData = change.after.data();
  const index = client.initIndex('events');
  newData.objectID = newData.eventId;
  return index.saveObject(newData);
})

exports.deleteEventsIndex = functions
.region('europe-west2')
.firestore.document('events/{id}')
.onDelete((snap) => {
  const index = client.initIndex('events');
  index.deleteObject(snap.id);
})

// Resources
exports.addToResourcesIndex = functions
.region('europe-west2')
.firestore.document('resources/{id}')
.onCreate((snap, _context) => {
  const data = snap.data()
  data.objectID = snap.id;
  data.createdAtAsTimestamp = Date.parse(data.createdAt)
  const index = client.initIndex('resources');
  return index.saveObject(data);
})

exports.updateResourcesIndex = functions
.region('europe-west2')
.firestore.document('resources/{id}')
.onUpdate((change) => {
  const newData = change.after.data();
  const index = client.initIndex('resources');
  newData.objectID = newData.resourceId;
  return index.saveObject(newData);
})

exports.deleteResourcesIndex = functions
.region('europe-west2')
.firestore.document('resources/{id}')
.onDelete((snap) => {
  const index = client.initIndex('resources');
  index.deleteObject(snap.id);
})

// companies
exports.addToCompaniesIndex = functions
.region('europe-west2')
.firestore.document('companies/{id}')
.onCreate((snap, _context) => {
  const data = snap.data()
  data.objectID = snap.id;
  const index = client.initIndex('companies');
  return index.saveObject(data);
})

exports.updateCompaniesIndex = functions
.region('europe-west2')
.firestore.document('companies/{id}')
.onUpdate((change) => {
  const newData = change.after.data();
  const index = client.initIndex('companies');
  newData.objectID = newData.companyId;
  return index.saveObject(newData);
})

exports.deleteCompanyFromIndex = functions
.region('europe-west2')
.firestore.document('companies/{id}')
.onDelete((snap) => {
  const index = client.initIndex('companies');
  index.deleteObject(snap.id);
})

// Knowledge and Skills
exports.addToSkillsIndex = functions
.region('europe-west2')
.firestore.document('skills/{id}')
.onCreate((snap, _context) => {
  const data = snap.data()
  data.objectID = snap.id;
  const index = client.initIndex('skills');
  return index.saveObject(data);
})

exports.updateSkillsIndex = functions
.region('europe-west2')
.firestore.document('skills/{id}')
.onUpdate((change) => {
  const newData = change.after.data();
  const index = client.initIndex('skills');
  newData.objectID = newData.skillId;
  return index.saveObject(newData);
})

exports.deleteSkillsFromIndex = functions
.region('europe-west2')
.firestore.document('skills/{id}')
.onDelete((snap) => {
  const index = client.initIndex('skills');
  index.deleteObject(snap.id);
})
