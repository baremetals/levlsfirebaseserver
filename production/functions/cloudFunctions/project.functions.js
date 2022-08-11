const functions = require("firebase-functions");
const { db } = require('../utils/admin');


exports.newProjectPendingNotification = functions
  .region('europe-west2')
  .firestore.document('projects/{id}')
  .onCreate((snapshot) => {
    const title = snapshot.data().title
    db.doc(`projects/${snapshot.id}`)
      .update({projectId: snapshot.id})
      .then(() => {
        return db.doc(`notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: snapshot.data().userId,
          sender: 'levls',
          message: `Your project, ${title} is pending verification.`,
          type: 'project pending',
          read: false,
          avatar: '',
        });
      })
    .catch((err) => console.error(err));   
})

exports.projectActiveNotification = functions
  .region('europe-west2')
  .firestore.document('projects/{id}')
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
          message: `Your project, ${title} is now active.`,
          type: 'project active',
          read: false,
          avatar: '',
          postId: oldData.projectId,
        })
        .catch((err) => console.error(err));  
    }    
})

// **New comment**
exports.commentProjectNotification = functions
  .region('europe-west2')
  .firestore.document('comments/{id}')
  .onCreate(async (snapshot) => {
    const username = snapshot.data().username
    const imageUrl = snapshot.data().imageUrl
    const caption = snapshot.data().caption
    return db
      .doc(`/projects/${snapshot.data().projectId}`)
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
            type: 'project comment',
            read: false,
            projectId: snapshot.id,
            postId: snapshot.data().projectId,
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
exports.deleteProjectCommentNotification = functions
  .region('europe-west2')
  .firestore.document('comments/{id}')
  .onDelete(async (snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
      });
})

// **New likes notification - for hosts**
exports.likeProjectNotification = functions
  .region('europe-west2')
  .firestore.document('likes/{id}')
  .onCreate(async (snapshot) => {
    return db
      .doc(`/projects/${snapshot.data().projectId}`)
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
            type: 'project like',
            read: false,
            projectId: doc.id,
            postId: snapshot.data().projectId,
            avatar: snapshot.data().imageUrl,
            message: `${snapshot.data().username} liked your project`
          });
        }
      })
      .catch((err) => console.error(err));
});

// **Delete notification when user unlikes **
exports.deleteProjectLikeNotification = functions
  .region('europe-west2')
  .firestore.document('likes/{id}')
  .onDelete(async (snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
      });
})

// If the project is deleted.
exports.onProjectDelete = functions
  .region('europe-west2')
  .firestore.document('projects/{projectId}')
  .onDelete(async (snapshot, _context) => {
    const projectId = snapshot.id;
    const batch = db.batch();
    return db
      .collection('comments')
      .where('projectId', '==', projectId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`comments/${doc.id}`));
        });
        return db
          .collection('likes')
          .where('projectId', '==', projectId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`likes/${doc.id}`));
        });
        return db
          .collection('notifications')
          .where('projectId', '==', projectId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return db
          .collection('mobile timeline')
          .where('projectId', '==', projectId)
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