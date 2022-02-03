const functions = require("firebase-functions");
const { db } = require('../utils/admin');

// **New Event Alert for users**
exports.newEventNotification = functions
  .region('europe-west2')
  .firestore.document('events/{id}')
  .onCreate((snapshot) => {
    const data = snapshot.data()

    return db
      .doc(`/notifications/${snapshot.id}`)
      .set({
        createdAt: new Date().toISOString(),
        message: `The event ${data.title} has been created.`,
        type: 'new event',
        read: false,
        recipient: doc.data().userId,
        sender: 'levls',
        avatar: '',
      })
      .catch((err) => console.error(err));   
})

// **New comment notification for event - for hosts**
exports.createNotificationOnEventComment = functions
  .region('europe-west2')
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    const username = snapshot.data().username
    const imageUrl = snapshot.data().imageUrl
    const eventTitle = snapshot.data().eventTitle
    return db
      .doc(`/events/${snapshot.data().eventId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().username !== username
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userId,
            sender: username,
            type: 'event comment',
            read: false,
            eventId: snapshot.id,
            avatar: imageUrl,
            message: `${eventTitle} received a new comment from ${username}`,
            commentId: snapshot.id
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
});

// **Delete notification when user deletes comment on the event**
exports.deleteNotificationOnDeleteEventComment = functions
  .region('europe-west2')
  .firestore.document('comments/{id}')
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
      });
})

// **New likes notification for event - for hosts**
exports.createNotificationOnLikeEvent = functions
  .region('europe-west2')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/events/${snapshot.data().eventId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().username !== snapshot.data().username
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userId,
            sender: snapshot.data().username,
            type: 'event like',
            read: false,
            eventId: doc.id,
            avatar: snapshot.data().imageUrl,
            message: `${snapshot.data().username} liked your event`
          });
        }
      })
      .catch((err) => console.error(err));
});

// **Delete notification when user unlikes the event**
exports.deleteNotificationOnUnLikeEvent = functions
  .region('europe-west2')
  .firestore.document('likes/{id}')
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
      });
})
