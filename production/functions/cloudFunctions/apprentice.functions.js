const functions = require('firebase-functions');
const { db } = require('../utils/admin');
const sgMail = require('@sendgrid/mail');

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
  .firestore.document('apprenticeships/{apprenticeshipId}/submissions/{userId}')
  .onCreate(async (snap) => {
    const data = snap.data();
    db.doc(`/users/${data.organisationId}`)
      .get()
      .then(async (doc) => {
        const msgArray = [
          {
            to: `${data.email}`, // recipient
            from: 'LEVLS. <noreply@levls.io>', // Change to verified sender
            template_id: 'd-907fe6fb691243799a37f3cd895f8828',
            dynamic_template_data: {
              title: data.apprenticeshipTitle,
              name: data.name.split(' ')[0],
              organisation: doc.data().username || doc.data().organisationName,
              url: `https://levls.io/latest-opportunities`,
            },
          },
          {
            to: `${doc.data().email}`, // recipient
            from: 'LEVLS. <noreply@levls.io>', // Change to verified sender
            template_id: 'd-dc9202ecdcc04c06bfe1175aa1e14569',
            dynamic_template_data: {
              title: data.apprenticeshipTitle,
              fullname: data.name,
              organisation: doc.data().organisationName,
              url: `https://levls.io/dashboard/apprenticeships`,
              email: data.email,
            },
          },
        ];

        await db.collection(`/notifications`).add({
          createdAt: new Date().toISOString(),
          message: `Your application for ${data.apprenticeshipTitle} has received.`,
          type: 'new apprenticeship application',
          read: false,
          recipient: data.applicantUserId,
          sender: 'levls',
          avatar: data.applicantImageUrl,
        });

        return db
          .collection(`/notifications`)
          .add({
            createdAt: new Date().toISOString(),
            message: `Your apprenticeship '${data.apprenticeshipTitle}' has been received 
      a new application from ${data.name}`,
            type: 'new submission',
            read: false,
            opps: 'apprenticeships',
            recipient: data.organisationId,
            sender: 'levls',
            avatar: data.applicantImageUrl,
            url: `https://levls.io/dashboard/apprenticeships`,
          })
          .then(() => {
            msgArray.forEach(async (msg) => {
              await sgMail.send(msg);
              return console.log('done');
            });
          })
          .catch((err) => {
            return console.error(err);
          });
      })
      .catch((err) => {
        return console.error(err);
      });
  });
