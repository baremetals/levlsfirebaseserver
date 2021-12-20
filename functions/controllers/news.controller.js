const { admin, db } = require('../utils/admin');
const config = require("../utils/database");
const { v4: uuidv4 } = require('uuid');

// Fetch all news post
exports.getAllPosts = (req, res) => {
  db.collection('news')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let posts = [];
      data.forEach((doc) => {
        posts.push({
          newsId: doc.id,
          title: doc.data().title,
          shortDescription: doc.data().shortDescription,
          content: doc.data().content,
          username: doc.data().username,
          imageUrl: doc.data().imageUrl,
          userId: doc.data().userId,
          createdAt: doc.data().createdAt,
          uploadUrl: doc.data().uploadUrl,
          contentType: doc.data().contentType,
          category: doc.data().category,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          viewsCount: doc.data.viewsCount
        });
        
      });
      
      return res.json(posts);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong please try again.' });
    });
};

exports.getAllOrgPosts = (req, res) => {
  db.collection('news')
    .where('userId', '==', req.params.userId)
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let posts = [];
      data.forEach((doc) => {
        posts.push({
          newsId: doc.id,
          title: doc.data().title,
          shortDescription: doc.data().shortDescription,
          content: doc.data().content,
          username: doc.data().username,
          imageUrl: doc.data().imageUrl,
          userId: doc.data().userId,
          createdAt: doc.data().createdAt,
          uploadUrl: doc.data().uploadUrl,
          contentType: doc.data().contentType,
          category: doc.data().category,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          viewsCount: doc.data.viewsCount
        });
        
      });
      
      return res.json(posts);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong please try again.' });
    });
};

// Create news post
exports.createPost = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  let docId;
  let resArticle;

  if (req.body.customUrl) {
    if (req.body.title.trim() === '') {
      return res.status(400).json({ error: 'Title must not be empty' });
    }
    if (req.body.shortDescription.trim() === '') {
      return res.status(400).json({ error: 'Short description must not be empty' });
    }
    if (req.body.content.trim() === '') {
      return res.status(400).json({ error: 'Content must not be empty' });
    }
    if (req.body.customUrl.trim() === '') {
      return res.status(400).json({ error: 'Url must not be empty' });
    }
    const newArticle = {
      uploadUrl: req.body.customUrl,
      title: req.body.title,
      shortDescription: req.body.shortDescription,
      content: req.body.content,
      category: req.body.category,
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: req.user.username,
      userId: req.user.userId,
      imageUrl: req.user.imageUrl,
      likeCount: 0,
      commentCount: 0,
      contentType: 'news',
      viewsCount: 0 
      
    };

    db.collection('news')
        .add(newArticle)
        .then((doc) => {
          resArticle = newArticle;
          resArticle.timelineId = doc.id;
          docId = doc.id
        })
        .then(() => {
          db.doc(`mobile timeline/${docId}`).set(resArticle)
          return res.json(resArticle);
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({ error: 'Something went wrong' });
        });
  } else {
    const busboy = new BusBoy({ headers: req.headers });
    const imageUrl = req.user.imageUrl
    const userId = req.user.userId
    const username = req.user.username

    let imageToBeUploaded = {};
    let imageFileName;
    let generatedToken = uuidv4();
    let newArticle = {};


    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
      newArticle[fieldname] = val
    });

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      if (mimetype !== "image/jpeg" && mimetype !== "image/jpg" && mimetype !== "image/png" && mimetype !== "video/mp4" && mimetype !== "video/swf") {
        return res.status(400).json({ error: "Wrong file type submitted" });
      }
      const imageExtension = filename.split(".")[filename.split(".").length - 1];
      // 32756238461724837.png
      imageFileName = `${Math.round(
        Math.random() * 1000000000000
      ).toString()}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), path.basename(imageFileName));
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));

      admin
        .storage()
        .bucket(config.storageBucket)
        .upload(imageToBeUploaded.filepath, {
          destination: `news/${imageFileName}`,
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype,
              //Generate token to be appended to imageUrl
              firebaseStorageDownloadTokens: generatedToken,
            },
          }, 
        })
        .catch((err) => {
          res.status(500).json({ error: 'Erm... That was strange, please try again later! ' });
          console.error(err);
        });
      
    });

    busboy.on("finish", () => {
      const uploadUrl = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/news%2F${imageFileName}?alt=media&token=${generatedToken}`;
      newArticle.uploadUrl = uploadUrl;
      newArticle.userId = userId;
      newArticle.username = username;
      newArticle.contentType = 'news';
      newArticle.imageUrl = imageUrl;
      newArticle.createdAt = new Date().toISOString();
      newArticle.post_time_stamp = Date.parse(post_time_stamp)
      newArticle.likeCount = 0
      newArticle.commentCount = 0
      newArticle.viewsCount = 0
      db.collection('news')
        .add(newArticle)
        .then((doc) => {
          resArticle = newArticle;
          resArticle.timelineId = doc.id;
          docId = doc.id
        })
        .then(() => {
          db.doc(`mobile timeline/${docId}`).set(resArticle)
          return res.json(resArticle);
        })
        .catch((err) => {
          res.status(500).json({ error: 'something went wrong' });
          console.error(err);
        });
    });

    busboy.end(req.rawBody);
  }
  
};

// Fetch one news post
exports.getPost = (req, res) => {
  let newsData = {};
  db.doc(`/news/${req.params.newsId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Post not found' });
      }
      newsData = doc.data();
      newsData.newsId = doc.id;
      doc.ref.update({ viewsCount: doc.data().viewsCount + 1 });
      return res.json(newsData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Comment on a news post
exports.commentOnPost = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.newsId}`)
  if (req.body.comment.trim() === '')
    return res.status(400).json({ comment: 'Must not be empty' });

  const newComment = {
    comment: req.body.comment,
    createdAt: new Date().toISOString(),
    newsId: req.params.newsId,
    mobPostId: req.params.newsId,
    username: req.user.username,
    userImage: req.user.imageUrl,
    userId: req.user.userId,
    edited: false
  };
  console.log(newComment);

  db.doc(`/news/${req.params.newsId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Post not found' });
      }
      newComment.postOwnerId = doc.data().userId;
      doc.ref.update({ commentCount: doc.data().commentCount + 1 });
      return mobTimelineDoc.get()
    })
    .then((doc) => {
      if (!doc.exists) {        
        return res.status(404).json({ error: 'Mobile content not found' });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection('comments').add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: 'Something went wrong' });
    });
};

// Delete a comment
exports.deleteNewsComment = (req, res) => {
  const decrement = admin.firestore.FieldValue.increment(-1);
  const commentDoc = db.doc(`/comments/${req.params.commentId}`);
  let timeLineDoc;
  let newsDoc;
  let newsId;
  const batch = db.batch();

  commentDoc
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Comment not found' });
      } else {
        newsId = doc.data().newsId
        newsDoc = db.doc(`/news/${newsId}`)
        timeLineDoc = db.doc(`/mobile timeline/${newsId}`);
        return commentDoc.delete();
      }
    })
    .then(() => {
      batch.set(newsDoc, { commentCount: decrement }, { merge: true });
      batch.set(timeLineDoc, { commentCount: decrement }, { merge: true });
      return batch.commit();
    })
    .then(() => {
      return res.json({ message: 'Comment deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
}

// Like a news post
exports.likePost = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.newsId}`)
  const likeDocument = db
    .collection('likes')
    .where('userId', '==', req.user.userId)
    .where('newsId', '==', req.params.newsId)
    .limit(1);

  const articleDocument = db.doc(`/news/${req.params.newsId}`);

  let articleData;
  let newsOwnerId;
  let mobTimelineData;

  articleDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        articleData = doc.data();
        articleData.newsId = doc.id;
        newsOwnerId = articleData.userId
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'Post not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection('likes')
          .add({
            newsId: req.params.newsId,
            username: req.user.username,
            userId: req.user.userId,
            createdAt: new Date().toISOString(),
            newsOwnerId: newsOwnerId,
            imageUrl: req.user.imageUrl
          })
          .then(() => {
            articleData.likeCount++;
            articleDocument.update({ likeCount: articleData.likeCount });
            return mobTimelineDoc.get()
          })
          .then((doc) => {
            if (!doc.exists) {        
              return res.status(404).json({ error: 'Mobile content not found' });
            }
            mobTimelineData = doc.data();
            mobTimelineData.likeCount++;
            return mobTimelineDoc.update({ likeCount: mobTimelineData.likeCount });
          })
          .then(() => {
            return res.json(articleData);
          });
      } else {
        return res.status(400).json({ error: 'Post already liked' });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Unlike news post
exports.unLikePost = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.newsId}`)
  const likeDocument = db
    .collection('likes')
    .where('userId', '==', req.user.userId)
    .where('newsId', '==', req.params.newsId)
    .limit(1);

  const articleDocument = db.doc(`/news/${req.params.newsId}`);

  let articleData;
  let mobTimelineData;

  articleDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        articleData = doc.data();
        articleData.newsId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'Post not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: 'Post not liked' });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            articleData.likeCount--;
            articleDocument.update({ likeCount: articleData.likeCount });
            return mobTimelineDoc.get();
          })
          .then((doc) => {
            if (!doc.exists) {        
              return res.status(404).json({ error: 'Mobile content not found' });
            }
            mobTimelineData = doc.data();
            mobTimelineData.likeCount--;
            return mobTimelineDoc.update({ likeCount: mobTimelineData.likeCount });
          })
          .then(() => {
            res.json(articleData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Delete a news post
exports.deletePost = (req, res) => {
  const document = db.doc(`/news/${req.params.newsId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Post not found' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'The Post was deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Update news post
exports.updatePost = (req, res) => {
  let postDetails = req.body;
  const newsDocument = db.doc(`/news/${req.params.newsId}`)

  newsDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Post not found' });
      }
      newsDocument.update(postDetails)
      return db.doc(`/mobile timeline/${req.params.newsId}`).update(postDetails);
      
    })
    .then(() => {
      return res.json({ message: "Post updated successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

