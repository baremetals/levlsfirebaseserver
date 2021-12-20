const functions = require("firebase-functions");
const { db } = require('../utils/admin');


exports.newResourcePendingNotification = functions
  .region('europe-west2')
  .firestore.document('resources/{id}')
  .onCreate((snapshot) => {
    const title = snapshot.data().title
    db.doc(`resources/${snapshot.id}`)
      .update({resourceId: snapshot.id})
      .then(() => {
        return db.doc(`notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: snapshot.data().userId,
          sender: 'justappli',
          message: `Your resource, ${title} is pending verification.`,
          type: 'resource pending',
          read: false,
          avatar: ''
        })
      })
    .catch((err) => console.error(err));   
})

exports.resourceActiveNotification = functions
  .region('europe-west2')
  .firestore.document('resources/{id}')
  .onUpdate((change) => {
    const oldData = change.before.data()
    const newData = change.after.data()
    const title = oldData.title

    if (oldData.isActive !== newData.isActive) {
      return db.collection('notifications').add({
        createdAt: new Date().toISOString(),
        recipient: oldData.userId,
        sender: 'justappli',
        message: `Your resource, ${title} is now active.`,
        type: 'resource active',
        read: false,
        avatar: '',
        postId: oldData.resourceId,
      })
      .catch((err) => console.error(err));  
    }    
})


exports.resourceCommentNotification = functions
  .region('europe-west2')
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    const username = snapshot.data().username
    const imageUrl = snapshot.data().userImage
    return db
      .doc(`/resources/${snapshot.data().resourceId}`)
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
            postId: snapshot.data().resourceId,
            type: 'resource comment',
            read: false,
            resourceId: doc.id,
            avatar: imageUrl,
            message: `You received a new comment from ${username}`
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
});


exports.deleteNotificationOnDeleteResourceComment = functions
  .region('europe-west2')
  .firestore.document('comments/{id}')
  .onDelete((snapshot) => {
    
    return db
    .doc(`/notifications/${snapshot.id}`)
    .delete()
    .catch((err) => {
    return console.error(err);
  });
})


exports.createNotificationOnResourceLike = functions
  .region('europe-west2')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/resources/${snapshot.data().resourceId}`)
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
            type: 'resource like',
            read: false,
            newsId: doc.id,
            postId: snapshot.data().resourceId,
            avatar: snapshot.data().imageUrl,
            message: `${snapshot.data().username} liked your resource`
          });
        }
      })
      .catch((err) => console.error(err));
});


exports.deleteNotificationOnUnLikeResource = functions
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

// If the resource is deleted.
exports.onResourceDelete = functions
  .region('europe-west2')
  .firestore.document('resources/{resourceId}')
  .onDelete((snapshot, context) => {
    const resourceId = snapshot.id;
    const batch = db.batch();
    return db
      .collection('comments')
      .where('resourceId', '==', resourceId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`comments/${doc.id}`));
        });
        return db
          .collection('likes')
          .where('resourceId', '==', resourceId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`likes/${doc.id}`));
        });
        return db
          .collection('notifications')
          .where('resourceId', '==', resourceId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return db
          .collection('mobile timeline')
          .where('resourceId', '==', resourceId)
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