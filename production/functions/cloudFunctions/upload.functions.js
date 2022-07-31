const functions = require("firebase-functions");
const { db } = require('../utils/admin');


exports.newUploadPendingNotification = functions
  .region('europe-west2')
  .firestore.document('uploads/{id}')
  .onCreate((snapshot) => {
    db.doc(`uploads/${snapshot.id}`)
      .update({ uploadId: snapshot.id, pageUrl: `upload/${snapshot.id}` })
      .catch((err) => console.error(err));   
})


// **New comment**
exports.commentNotification = functions
  .region('europe-west2')
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    const username = snapshot.data().username
    const imageUrl = snapshot.data().imageUrl
    let caption;
    return db
      .doc(`/uploads/${snapshot.data().uploadId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().username !== username
        ) {
          caption = doc.data().caption
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userId,
            sender: username,
            type: 'upload comment',
            read: false,
            uploadId: snapshot.id,
            postId: snapshot.data().uploadId,
            avatar: imageUrl,
            message: `Your post ${caption} received a new comment from ${username}`,
            commentId: snapshot.id
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
});

// **Delete notification when user deletes comment**
exports.deleteCommentNotification = functions
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

// **New likes notification for upload - for hosts**
exports.likeNotification = functions
  .region('europe-west2')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/uploads/${snapshot.data().uploadId}`)
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
            type: 'new like',
            read: false,
            uploadId: doc.id,
            postId: snapshot.data().uploadId,
            avatar: snapshot.data().imageUrl,
            message: `${snapshot.data().username} liked your post`
          });
        }
      })
      .catch((err) => console.error(err));
});

// **Delete notification when user unlikes **
exports.deleteLikeNotification = functions
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

// If the upload is deleted.
exports.onUploadDelete = functions
  .region('europe-west2')
  .firestore.document('uploads/{uploadId}')
  .onDelete((snapshot, context) => {
    const uploadId = snapshot.id;
    const batch = db.batch();
    return db
      .collection('comments')
      .where('uploadId', '==', uploadId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`comments/${doc.id}`));
        });
        return db
          .collection('likes')
          .where('uploadId', '==', uploadId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`likes/${doc.id}`));
        });
        return db
          .collection('notifications')
          .where('uploadId', '==', uploadId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return db
          .collection('mobile timeline')
          .where('uploadId', '==', uploadId)
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

