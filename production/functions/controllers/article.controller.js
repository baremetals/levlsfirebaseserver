const { admin, db } = require('../utils/admin');
const config = require("../utils/database");
const { uuid } = require('uuidv4');

// Fetch all articles
exports.getAllArticles = (req, res) => {
  db.collection('articles')
    .where('userId', '==', req.params.userId)
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let articles = [];
      data.forEach((doc) => {
        articles.push({
          ...doc.data(),
          articleId: doc.id,
        });
        
      });
      return res.json(articles);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong please try again.' });
    });
};

// Create An Article
exports.writeAnArticle = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  let docId;
  let resArticle;

  if (req.body.customUrl) {

    if (req.body.title.trim() === '') {
      return res.status(400).json({ title: 'Title must not be empty' });
    }
    if (req.body.shortDescription.trim() === '') {
      return res.status(400).json({ shortDescription: 'Short description must not be empty' });
    }
    if (req.body.content.trim() === '') {
      return res.status(400).json({ content: 'Comtent must not be empty' });
    }
    if (req.body.customUrl.trim() === '') {
      return res.status(400).json({ customUrl: 'Url must not be empty' });
    }

    const slug =
      req.body.title
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-') +
      '-' +
      Date.parse(post_time_stamp);

    const newArticle = {
      uploadUrl: req.body.customUrl,
      title: req.body.title,
      slug,
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
      contentType: 'article',
      isActive: false,
      viewsCount: 0,
      isPartner: false,
      pageUrl: `article/${slug}`,
      state: 'draft',
      addToCV: req.body.addToCV,
    };

    db.collection('articles')
        .add(newArticle)
        .then((doc) => {
          resArticle = newArticle;
          resArticle.timelineId = doc.id;
          docId = doc.id;
        })
        .then(async () => {
          await db.doc(`mobile timeline/${docId}`).set(resArticle)
          if (req.body.addToCV || req.body.addToCV === 'true') {
            await db
              .doc(`users/${req.user.userId}/digital-cv/${docId}`)
              .set({ ...resArticle, contentType: 'article ' });
          }
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
    let generatedToken = uuid();
    let newArticle = {};


    busboy.on('field', function(fieldname, val, _fieldnameTruncated, _valTruncated, _encoding, _mimetype) {
      // console.log('Field [' + fieldname + ']: value: ' + inspect(val));
      newArticle[fieldname] = val
    });

    busboy.on("file", (_fieldname, file, filename, _encoding, mimetype) => {
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
          destination: `articles/${imageFileName}`,
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
      const slug =
        newArticle.title
          .toLowerCase()
          .replace(/[^\w ]+/g, '')
          .replace(/ +/g, '-') +
        '-' +
        Date.parse(post_time_stamp);
      const uploadUrl = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/articles%2F${imageFileName}?alt=media&token=${generatedToken}`;
      newArticle.uploadUrl = uploadUrl;
      newArticle.userId = userId;
      newArticle.slug = slug;
      newArticle.username = username;
      newArticle.contentType = 'article';
      newArticle.imageUrl = imageUrl;
      newArticle.createdAt = new Date().toISOString();
      newArticle.post_time_stamp = Date.parse(post_time_stamp)
      newArticle.likeCount = 0
      newArticle.commentCount = 0
      newArticle.viewsCount = 0
      newArticle.isActive = false
      newArticle.isPartner = false
      newArticle.pageUrl = `article/${slug}`
      newArticle.state = 'draft'
      db.collection('articles')
        .add(newArticle)
        .then((doc) => {
          resArticle = newArticle;
          resArticle.timelineId = doc.id;
          docId = doc.id;
        })
        .then(async () => {
          await db.doc(`mobile timeline/${docId}`).set(resArticle)
          if (resArticle.addToCV || resArticle.addToCV === 'true') {
            await db
              .doc(`users/${req.user.userId}/digital-cv/${docId}`)
              .set({ ...resArticle, contentType: 'article' });
          }
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

// Fetch one article
exports.getAnArticle = (req, res) => {
  let articleData = {};
  db.collection('articles')
    .where('slug', '==', req.params.slug)
    .get()
    .then((data) => {
      if (data.length === 0) {
        return res.status(404).json({ error: 'Article not found' });
      }
      data.forEach((doc) => {
        articleData = doc.data();
        articleData.articleId = doc.id;
        doc.ref.update({ viewsCount: doc.data().viewsCount + 1 });
      });
      return res.json(articleData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Comment on a article
exports.commentOnArticle = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.articleId}`)
  if (req.body.comment.trim() === '')
    return res.status(400).json({ comment: 'Must not be empty' });

  const newComment = {
    comment: req.body.comment,
    createdAt: new Date().toISOString(),
    articleId: req.params.articleId,
    mobPostId: req.params.articleId,
    username: req.user.username,
    userImage: req.user.imageUrl,
    userId: req.user.userId,
    edited: false
  };

  db.doc(`/articles/${req.params.articleId}`)
    .get()
    .then(async(doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Article not found' });
      }
      newComment.articleOwnerId = doc.data().userId;
      await doc.update({ commentCount: doc.data().commentCount + 1 });
      if (doc.data().addToCV || doc.data().addToCV === 'true')
        await db
          .doc(`/users/${doc.data().userId}/digital-cv/${req.params.articleId}`)
          .get()
          .then(async (dc) => {
            if (dc.exists) {
              await db
                .doc(
                  `/users/${doc.data().userId}/digital-cv/${
                    req.params.articleId
                  }`
                )
                .update({ commentCount: doc.data().commentCount + 1 });
            }
          });
      return mobTimelineDoc.get()
    })
    .then((doc) => {
      if (!doc.exists) {        
        return res.status(404).json({ error: 'Mobile content not found' });
      }
      return doc.update({ commentCount: doc.data().commentCount + 1 });
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
exports.deleteArticleComment = (req, res) => {
  const decrement = admin.firestore.FieldValue.increment(-1);
  const commentDoc = db.doc(`/comments/${req.params.commentId}`);
  let timeLineDoc;
  let articleDoc;
  let articleId;
  const batch = db.batch();

  commentDoc
    .get()
    .then(async(doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Comment not found' });
      } else {
        articleId = doc.data().articleId
        articleDoc = db.doc(`/articles/${articleId}`);
        timeLineDoc = db.doc(`/mobile timeline/${articleId}`);
        await articleDoc.get().then(async (d) => {
          if (d.data().addToCV || d.data().addToCV === 'true')
            await db
              .doc(`/users/${d.data().userId}/digital-cv/${articleId}`)
              .get()
              .then(async (dc) => {
                if (dc.exists) {
                  await db
                    .doc(`/users/${d.data().userId}/digital-cv/${articleId}`)
                    .ref.update({ commentCount: doc.data().commentCount - 1 });
                }
              });
        });
        return commentDoc.delete();
      }
    })
    .then(() => {
      batch.set(articleDoc, { commentCount: decrement }, { merge: true });
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

// Like a article
exports.likeAnArticle = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.articleId}`)
  const likeDocument = db
    .collection('likes')
    .where('userId', '==', req.user.userId)
    .where('articleId', '==', req.params.articleId)
    .limit(1);

  const articleDocument = db.doc(`/articles/${req.params.articleId}`);

  let articleData;
  let articleOwnerId;
  let mobTimelineData;

  articleDocument
    .get()
    .then(async(doc) => {
      if (doc.exists) {
        articleData = doc.data();
        articleData.articleId = doc.id;
        articleOwnerId = articleData.userId
        if (doc.data().addToCV || doc.data().addToCV === 'true')
          await db
            .doc(
              `/users/${doc.data().userId}/digital-cv/${req.params.articleId}`
            )
            .get()
            .then(async (dc) => {
              if (!dc.exists) {
                await db
                  .doc(
                    `/users/${doc.data().userId}/digital-cv/${
                      req.params.articleId
                    }`
                  )
                  .update({ likeCount: doc.data().likeCount + 1 });
              }
            });
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'Upload not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection('likes')
          .add({
            articleId: req.params.articleId,
            username: req.user.username,
            userId: req.user.userId,
            createdAt: new Date().toISOString(),
            articleOwnerId: articleOwnerId,
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
        return res.status(400).json({ error: 'Article already liked' });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Unlike a article
exports.unLikeAnArticle = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.articleId}`)
  const likeDocument = db
    .collection('likes')
    .where('userId', '==', req.user.userId)
    .where('articleId', '==', req.params.articleId)
    .limit(1);

  const articleDocument = db.doc(`/articles/${req.params.articleId}`);

  let articleData;
  let mobTimelineData;

  articleDocument
    .get()
    .then(async(doc) => {
      if (doc.exists) {
        articleData = doc.data();
        articleData.articleId = doc.id;
        if (doc.data().addToCV || doc.data().addToCV === 'true')
          await db
            .doc(
              `/users/${doc.data().userId}/digital-cv/${req.params.articleId}`
            )
            .get()
            .then(async (dc) => {
              if (!dc.exists) {
                await db
                  .doc(
                    `/users/${doc.data().userId}/digital-cv/${
                      req.params.articleId
                    }`
                  )
                  .update({ likeCount: doc.data().likeCount - 1 });
              }
            });
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'Article not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: 'Article not liked' });
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

// Delete a article
exports.deleteArticle = (req, res) => {
  const document = db.doc(`/articles/${req.params.articleId}`);
  document
    .get()
    .then(async(doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Article not found' });
      } else {
        if (doc.data().addToCV || doc.data().addToCV === 'true')
          await db
            .doc(`/users/${req.user.userId}/digital-cv/${req.params.articleId}`)
            .get()
            .then(async (dc) => {
              if (dc.exists) {
                await db
                  .doc(
                    `/users/${req.user.userId}/digital-cv/${req.params.articleId}`
                  )
                  .delete();
              }
            });
        return document.delete();
      }
    })
    .then(() => {
      return db.doc(`/mobile timeline/${req.params.articleId}`).delete();
    })
    .then(() => {
      return res.json({ message: 'The Article was deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Update article data
exports.updateArticle = (req, res) => {
  let articleDetails = req.body;
  const articleDocument = db.doc(`/articles/${req.params.articleId}`)

  articleDocument
    .get()
    .then(async(doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Article not found' });
      }
      if (doc.data().addToCV || doc.data().addToCV === 'true')
        await db
          .doc(`/users/${req.user.userId}/digital-cv/${req.params.articleId}`)
          .get()
          .then(async (dc) => {
            if (dc.exists) {
              await db
                .doc(
                  `/users/${req.user.userId}/digital-cv/${req.params.articleId}`
                )
                .update(articleDetails);
            }
          });
      await articleDocument.update(articleDetails)
      return db.doc(`/mobile timeline/${req.params.articleId}`).update(articleDetails);
      
    })
    .then(() => {
      return res.json({ message: "Article updated successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

