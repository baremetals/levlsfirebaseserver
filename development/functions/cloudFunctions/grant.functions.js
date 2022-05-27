const functions = require("firebase-functions");
const { db } = require('../utils/admin');

exports.newGrantPendingNotification = functions
  .region('europe-west2')
  .firestore.document('grants/{id}')
  .onCreate((snapshot) => {
    const title = snapshot.data().title
    db.doc(`grants/${snapshot.id}`)
      .update({grantId: snapshot.id})
      .then(() => {
        return db.doc(`notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: snapshot.data().userId,
          sender: 'levls',
          message: `Your grant, ${title} is pending verification.`,
          type: 'grant pending',
          read: false,
          avatar: '',
        });
      })
    .catch((err) => console.error(err));   
})

exports.grantActiveNotification = functions
  .region('europe-west2')
  .firestore.document('grants/{id}')
  .onUpdate((change) => {
    const oldData = change.before.data()
    const newData = change.after.data()
    const title = oldData.title

    if (oldData.isActive !== newData.isActive) {
      return db
        .collection('notifications')
        .add({
          createdAt: new Date().toISOString(),
          recipient: oldData.userId,
          sender: 'levls',
          message: `Your grant, ${title} is now active.`,
          type: 'grant active',
          read: false,
          avatar: '',
          postId: oldData.grantId,
        })
        .catch((err) => console.error(err));  
    }    
})


// ** New Grant Application Alert **
exports.newGrantApplicationNotification = functions
  .region('europe-west2')
  .firestore.document('grants/{grantId}/submissions/{id}')
  .onCreate((snapshot) => {
    const data = snapshot.data()

    return db
      .doc(`/notifications/${snapshot.id}`)
      .set({
        createdAt: new Date().toISOString(),
        message: `Your ${data.grantType}, ${data.grantTitle} has received 
      a new application from ${data.applicantFullname}`,
        type: 'new grant application',
        read: false,
        recipient: data.grantHostUserId,
        sender: 'levls',
        avatar: data.applicantImageUrl,
      })
      .catch((err) => console.error(err));   
})