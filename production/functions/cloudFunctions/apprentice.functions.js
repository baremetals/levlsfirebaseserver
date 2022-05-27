const functions = require('firebase-functions');
const { db } = require('../utils/admin');

// **New Apprenticeship Created Alert for host**
exports.newApprenticeshipPendingNotification = functions
  .region('europe-west2')
  .firestore.document('apprenticeships/{id}')
  .onCreate((snapshot) => {
    const title = snapshot.data().title;
    db.doc(`apprenticeships/${snapshot.id}`)
    .update({ apprenticeshipId: snapshot.id })
    .then(() => {
      return db.doc(`notifications/${snapshot.id}`).set({
        createdAt: new Date().toISOString(),
        recipient: snapshot.data().userId,
        sender: 'levls',
        message: `Your apprenticeship, ${title} is pending verification.`,
        type: 'apprenticeship pending',
        read: false,
        avatar: '',
      });
    })
    .catch((err) => console.error(err)); 
  });


  // **New Apprenticeship Activated Alert for host**
exports.apprenticeshipActiveNotification = functions
  .region('europe-west2')
  .firestore.document('apprenticeships/{id}')
  .onUpdate((change) => {
    const oldData = change.before.data();
    const newData = change.after.data();
    const title = oldData.title;

    if (oldData.isActive !== newData.isActive) {
      return db
        .collection('notifications')
        .add({
          createdAt: new Date().toISOString(),
          recipient: oldData.userId,
          sender: 'levls',
          message: `Your apprenticeship, ${title} is now active.`,
          type: 'apprenticeship active',
          read: false,
          avatar: '',
          apprenticeshipId: oldData.apprenticeshipId,
        })
        .catch((err) => console.error(err));
    }
  });


// If the apprenticeship is deleted.
exports.onDeleteApprenticeship = functions
  .region('europe-west2')
  .firestore.document('apprenticeships/{id}')
  .onDelete((snapshot, _context) => {
    const apprenticeshipId = snapshot.id;
    const batch = db.batch();
    return db
      .collection('reviews')
      .where('apprenticeshipId', '==', apprenticeshipId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`reviews/${doc.id}`));
        });
        return db.collection('likes').where('apprenticeshipId', '==', apprenticeshipId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`likes/${doc.id}`));
        });
        return db
          .collection('notifications')
          .where('apprenticeshipId', '==', apprenticeshipId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return db
          .collection('mobile timeline')
          .where('apprenticeshipId', '==', apprenticeshipId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/mobile timeline/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });


// ** New Apprenticeship Application Alert **
exports.newApprenticeshipApplicationNotification = functions
  .region('europe-west2')
  .firestore.document('apprenticeships/{apprenticeshipId}/submissions/{id}')
  .onCreate((snapshot) => {
    const data = snapshot.data();

    return db
      .doc(`/notifications/${snapshot.id}`)
      .set({
        createdAt: new Date().toISOString(),
        message: `Your apprenticeship '${data.apprenticeshipTitle}' has received 
      a new application from ${data.applicantFullname}`,
        type: 'new apprenticeship application',
        read: false,
        recipient: data.apprenticeshipHostUserId,
        sender: 'levls',
        avatar: data.applicantImageUrl,
      })
      .catch((err) => console.error(err));
  });

