const functions = require("firebase-functions");
const { db } = require('../utils/admin');


// **New NewsPost Created Alert for host**
exports.newArticlePendingNotification = functions
  .region('europe-west2')
  .firestore.document('articles/{id}')
  .onCreate((snapshot) => {
    const title = snapshot.data().title
    db.doc(`articles/${snapshot.id}`)
      .update({articleId: snapshot.id})
      .then(() => {
        return db.doc(`notifications/${snapshot.id}`).set({
          createdAt: new Date().toISOString(),
          recipient: snapshot.data().userId,
          sender: 'levls',
          message: `Your article, ${title} is pending verification.`,
          type: 'article pending',
          read: false,
          avatar: ''
        })
      })
    .catch((err) => console.error(err));   
})

exports.articleActiveNotification = functions
  .region('europe-west2')
  .firestore.document('articles/{id}')
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
          message: `Your article, ${title} is now active.`,
          type: 'article active',
          read: false,
          avatar: '',
          postId: oldData.articleId,
        })
        .catch((err) => console.error(err));  
    }    
})

// **New comment notification for articles **
exports.articleCommentNotification = functions
  .region('europe-west2')
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    const username = snapshot.data().username
    const imageUrl = snapshot.data().userImage
    return db
      .doc(`/articles/${snapshot.data().articleId}`)
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
            postId: snapshot.data().articleId,
            type: 'article comment',
            read: false,
            articleId: doc.id,
            avatar: imageUrl,
            message: `You received a new comment from ${username}`
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
});

// **Delete notification when user deletes comment on an article**
exports.deleteNotificationOnDeleteArticleComment = functions
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

// **New likes notification for article **
exports.createNotificationOnArticleLike = functions
  .region('europe-west2')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/articles/${snapshot.data().articleId}`)
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
            type: 'article like',
            read: false,
            newsId: doc.id,
            postId: snapshot.data().articleId,
            avatar: snapshot.data().imageUrl,
            message: `${snapshot.data().username} liked your article`
          });
        }
      })
      .catch((err) => console.error(err));
});

// **Delete notification when user unlikes the article**
exports.deleteNotificationOnUnLikeArticle = functions
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

// If the article is deleted.
exports.onArticleDelete = functions
  .region('europe-west2')
  .firestore.document('articles/{articlesId}')
  .onDelete((snapshot, _context) => {
    const articleId = snapshot.id;
    const batch = db.batch();
    return db
      .collection('comments')
      .where('articleId', '==', articleId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`comments/${doc.id}`));
        });
        return db
          .collection('likes')
          .where('articleId', '==', articleId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`likes/${doc.id}`));
        });
        return db
          .collection('notifications')
          .where('articleId', '==', articleId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return db
          .collection('mobile timeline')
          .where('articleId', '==', articleId)
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