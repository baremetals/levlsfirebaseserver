const functions = require("firebase-functions");
const { db } = require('../utils/admin');


exports.newArticlePendingNotification = functions
  .region('europe-west2')
  .firestore.document('news/{id}')
  .onCreate((snapshot) => {
    const title = snapshot.data().title
    db.doc(`news/${snapshot.id}`)
      .update({newsId: snapshot.id})
      .then(() => {
        return db.doc(`notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: snapshot.data().userId,
          sender: 'levls',
          message: `Your news article, ${title} is pending verification.`,
          type: 'news article pending',
          read: false,
          avatar: ''
        })
      })
    .catch((err) => console.error(err));   
})

exports.articleActiveNotification = functions
  .region('europe-west2')
  .firestore.document('news/{id}')
  .onUpdate((change) => {
    const oldData = change.before.data()
    const newData = change.after.data()
    const title = oldData.title

    if (oldData.isActive !== newData.isActive) {
      return db.collection('notifications').add({
        createdAt: new Date().toISOString(),
        recipient: oldData.userId,
        sender: 'levls',
        message: `Your news article, ${title} is now active.`,
        type: 'news article active',
        read: false,
        avatar: '',
        postId: oldData.articleId,
      })
      .catch((err) => console.error(err));  
    }    
})


exports.createNotificationOnNewsPostComment = functions
  .region('europe-west2')
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    const username = snapshot.data().username
    const imageUrl = snapshot.data().userImage
    return db
      .doc(`/news/${snapshot.data().newsId}`)
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
            type: 'news comment',
            read: false,
            newsId: doc.id,
            postId: snapshot.data().newsId,
            avatar: imageUrl,
            message: `You received a new comment from ${username}`
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
});


exports.deleteNotificationOnDeleteNewsPostComment = functions
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


exports.createNotificationOnNewsPostLike = functions
  .region('europe-west2')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/news/${snapshot.data().newsId}`)
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
            type: 'news like',
            read: false,
            newsId: doc.id,
            postId: snapshot.data().newsId,
            avatar: snapshot.data().imageUrl,
            message: `${snapshot.data().username} liked your article`
          });
        }
      })
      .catch((err) => console.error(err));
});

// **Delete notification when user unlikes the newspost**
exports.deleteNotificationOnUnLikeNewsPost = functions
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

// If the newspost is deleted.
exports.onNewsPostDelete = functions
  .region('europe-west2')
  .firestore.document('news/{newsId}')
  .onDelete((snapshot, context) => {
    const newsId = snapshot.id;
    const batch = db.batch();
    return db
      .collection('comments')
      .where('newsId', '==', newsId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`comments/${doc.id}`));
        });
        return db
          .collection('likes')
          .where('newsId', '==', newsId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`likes/${doc.id}`));
        });
        return db
          .collection('notifications')
          .where('newsId', '==', newsId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return db
          .collection('mobile timeline')
          .where('newsId', '==', newsId)
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