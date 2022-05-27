const functions = require('firebase-functions');
const { db } = require('../utils/admin');

// **New Internship Created Alert for host**
exports.newInternshipPendingNotification = functions
  .region('europe-west2')
  .firestore.document('internships/{id}')
  .onCreate((snapshot) => {
    const title = snapshot.data().title;
    db.doc(`internships/${snapshot.id}`)
      .update({ internshipId: snapshot.id })
      .then(() => {
        return db.doc(`notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: snapshot.data().userId,
          sender: 'levls',
          message: `Your internship, ${title} is pending verification.`,
          type: 'internship pending',
          read: false,
          avatar: '',
        });
      })
      .catch((err) => console.error(err));
  });

// **New Internship Activated Alert for host**
exports.internshipActiveNotification = functions
  .region('europe-west2')
  .firestore.document('internships/{id}')
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
          message: `Your internship, ${title} is now active.`,
          type: 'internship active',
          read: false,
          avatar: '',
          internshipId: oldData.internshipId,
        })
        .catch((err) => console.error(err));
    }
  });

// If the Internship is deleted.
exports.onDeleteInternship = functions
  .region('europe-west2')
  .firestore.document('internships/{id}')
  .onDelete((snapshot, _context) => {
    const internshipId = snapshot.id;
    const batch = db.batch();
    return db
      .collection('reviews')
      .where('internshipId', '==', internshipId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`reviews/${doc.id}`));
        });
        return db
          .collection('likes')
          .where('internshipId', '==', internshipId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`likes/${doc.id}`));
        });
        return db
          .collection('notifications')
          .where('internshipId', '==', internshipId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return db
          .collection('mobile timeline')
          .where('internshipId', '==', internshipId)
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

// ** New Internship Application Alert **
exports.newInternshipApplicationNotification = functions
  .region('europe-west2')
  .firestore.document('internships/{internshipId}/submissions/{id}')
  .onCreate((snapshot) => {
    const data = snapshot.data();

    return db
      .doc(`/notifications/${snapshot.id}`)
      .set({
        createdAt: new Date().toISOString(),
        message: `Your internship '${data.internshipTitle}' has received 
      a new application from ${data.applicantFullname}`,
        type: 'new internship application',
        read: false,
        recipient: data.internshipHostUserId,
        sender: 'levls',
        avatar: data.applicantImageUrl,
      })
      .catch((err) => console.error(err));
  });
