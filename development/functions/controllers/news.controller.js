const { admin, db } = require('../utils/admin');
const config = require("../utils/database");
const { v4 } = require('uuid');
const sgMail = require('@sendgrid/mail');

// Fetch all news post
exports.getAllPosts = (req, res) => {
  db.collection('news')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let posts = [];
      data.forEach((doc) => {
        posts.push({
          ...doc.data(),
          newsId: doc.id,
          // title: doc.data().title,
          // shortDescription: doc.data().shortDescription,
          // slug: doc.data().slug,
          // content: doc.data().content,
          // username: doc.data().username,
          // imageUrl: doc.data().imageUrl,
          // userId: doc.data().userId,
          // createdAt: doc.data().createdAt,
          // uploadUrl: doc.data().uploadUrl,
          // contentType: doc.data().contentType,
          // category: doc.data().category,
          // likeCount: doc.data().likeCount,
          // commentCount: doc.data().commentCount,
          // viewsCount: doc.data().viewsCount,
          // isPartner: doc.data().isPartner,
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
          ...doc.data(),
          newsId: doc.id,
          // title: doc.data().title,
          // shortDescription: doc.data().shortDescription,
          // slug: doc.data().slug,
          // content: doc.data().content,
          // username: doc.data().username,
          // imageUrl: doc.data().imageUrl,
          // userId: doc.data().userId,
          // createdAt: doc.data().createdAt,
          // uploadUrl: doc.data().uploadUrl,
          // contentType: doc.data().contentType,
          // category: doc.data().category,
          // likeCount: doc.data().likeCount,
          // commentCount: doc.data().commentCount,
          // viewsCount: doc.data.viewsCount,
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

    const adminMsg = {
      to: 'admin@levls.io', // recipient
      from: 'LEVLS. <noreply@levls.io>',
      subject: `New Article - ${req.body.title}`,
      text: `${
        req.user.organisationName || req.body.username
      }, just created an article`,
      html: `
        <h3> Hello Admin </h3>
        <p>A new article has been created by ${
          req.user.organisationName || req.user.username
        }. Please review and activate </p>

        <a href=https://justappli-b9f5c.web.app/admin/articles/"> Visit </a>
        <p>Thank You.</p>
        <p>LEVLS</p>
      `,
    };

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
      shortDescription: req.body.shortDescription,
      slug,
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
      viewsCount: 0,
      isPartner: req.user.isPartner,
      isActive: false,
      pageUrl: `news-articles/${req.body.category.toLowerCase()}/${slug}`,
      state: 'draft',
    };

    db.collection('news')
        .add(newArticle)
        .then((doc) => {
          resArticle = newArticle;
          resArticle.timelineId = doc.id;
          docId = doc.id
        })
        .then(async () => {
          await db.doc(`mobile timeline/${docId}`).set(resArticle);
          await sgMail.send(adminMsg);
          return res.status(201).json(resArticle);
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
    const isPartner = req.user.isPartner;

    let imageToBeUploaded = {};
    let imageFileName;
    let generatedToken = v4();
    let newArticle = {};

    const adminMsg = {
      to: 'admin@levls.io', // recipient
      from: 'LEVLS. <noreply@levls.io>',
      subject: `New Article - ${req.body.title}`,
      text: `${
        req.user.organisationName || req.body.username
      }, just created an article`,
      html: `
        <h3> Hello Admin </h3>
        <p>A new article has been created by ${
          req.user.organisationName || req.user.username
        }. Please review and activate </p>

        <a href=https://justappli-b9f5c.web.app/admin/articles/"> Visit </a>
        <p>Thank You.</p>
        <p>LEVLS</p>
      `,
    };


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
      const slug =
        newArticle.title
          .toLowerCase()
          .replace(/[^\w ]+/g, '')
          .replace(/ +/g, '-') +
        '-' +
        Date.parse(post_time_stamp);
        
      const uploadUrl = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/news%2F${imageFileName}?alt=media&token=${generatedToken}`;
      newArticle.uploadUrl = uploadUrl;
      newArticle.userId = userId;
      newArticle.username = username;
      newArticle.slug = slug;
      newArticle.contentType = 'news';
      newArticle.imageUrl = imageUrl;
      newArticle.createdAt = new Date().toISOString();
      newArticle.post_time_stamp = Date.parse(post_time_stamp)
      newArticle.likeCount = 0
      newArticle.commentCount = 0
      newArticle.viewsCount = 0
      newArticle.isPartner = isPartner;
      newArticle.pageUrl = `news-articles/${newArticle.category.toLowerCase()}/${slug}`;
      newArticle.isActive = false;
      newArticle.state = 'draft'
      db
        .collection('news')
        .add(newArticle)
        .then((doc) => {
          resArticle = newArticle;
          resArticle.timelineId = doc.id;
          docId = doc.id;
        })
        .then(async () => {
          await db.doc(`mobile timeline/${docId}`).set(resArticle);
          await sgMail.send(adminMsg);
          return res.status(201).json(resArticle);
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
  db.collection('news')
    .where('slug', '==', req.params.slug)
    .get()
    .then((data) => {
      if (data.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
      data.forEach((doc) => {
        newsData = doc.data();
        newsData.newsId = doc.id;
        doc.ref.update({ viewsCount: doc.data().viewsCount + 1 });
      });
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
    .then(async(doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Post not found' });
      } else {
        await db
            .doc(`mobile timeline/${doc.id}`)
            .get().then(async(dc) => {
              if (dc.exists) return db.doc(`mobile timeline/${doc.id}`).delete();
            })
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
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  if (
    (req.body.uploadUrl ||
    req.body.uploadUrl === '') && !req.body.customUrl
  ) {
    console.log('I was in here bro');
    let postDetails = req.body;
    const newsDocument = db.doc(`/news/${req.params.newsId}`);
    newsDocument
      .get()
      .then(async (doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Post not found' });
        }
        console.log('checking if this code was called.')
        await newsDocument.update(postDetails);
        return db.doc(`/mobile timeline/${req.params.newsId}`).get();
      })
      .then(async (d) => {
        if (d.exists)
          await db
            .doc(`/mobile timeline/${req.params.newsId}`)
            .update(postDetails);
        return res.json({ message: 'Post updated successfully' });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  } else if (
    (req.body.customUrl ||
    req.body.customUrl === '') && req.body.uploadUrl
  ) {

    let postDetails = {
      title: req.body.title,
      shortDescription: req.body.shortDescription,
      content: req.body.content,
      category: req.body.category,
      uploadUrl: req.body.customUrl,
      updatedAt: new Date().toISOString(),
      // isActive: req.body.isActive,
      // state: req.body.state,
    };

    const newsDocument = db.doc(`/news/${req.params.newsId}`);
    newsDocument
      .get()
      .then(async (doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Post not found' });
        }
        await newsDocument.update(postDetails);
        return db.doc(`/mobile timeline/${req.params.newsId}`).get();
      })
      .then(async (d) => {
        if (d.exists)
          await db
            .doc(`/mobile timeline/${req.params.newsId}`)
            .update(postDetails);
        return res.json({ message: 'Post updated successfully' });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  } else {
    const busboy = new BusBoy({ headers: req.headers });
    let imageToBeUploaded = {};
    let imageFileName;
    let generatedToken = v4();
    let postDetails = {};
    const newsId = req.params.newsId;

    busboy.on(
      'field',
      function (
        fieldname,
        val,
        _fieldnameTruncated,
        _valTruncated,
        _encoding,
        _mimetype
      ) {
        // console.log('Field [' + fieldname + ']: value: ' + inspect(val));
        postDetails[fieldname] = val;
      }
    );

    busboy.on('file', (_fieldname, file, filename, _encoding, mimetype) => {
      if (
        mimetype !== 'image/jpeg' &&
        mimetype !== 'image/jpg' &&
        mimetype !== 'image/png' &&
        mimetype !== 'video/webm' &&
        mimetype !== 'video/mov' &&
        mimetype !== 'video/mp4' &&
        mimetype !== 'video/swf'
      ) {
        return res.status(400).json({ error: 'Wrong file type submitted' });
      }
      const imageExtension =
        filename.split('.')[filename.split('.').length - 1];
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
          res.status(500).json({
            error: 'Erm... That was strange, please try again later! ',
          });
          console.error(err);
        });
    });

    busboy.on('finish', () => {
      const newUrl = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/news%2F${imageFileName}?alt=media&token=${generatedToken}`;
      postDetails.uploadUrl = newUrl;
      postDetails.updatedAt = new Date().toISOString();
      db.doc(`news/${newsId}`)
        .get()
        .then(async (doc) => {
          if (!doc.exists) {
            return res.status(404).json({ error: 'Post not found' });
          }
          await db.doc(`news/${newsId}`).update(postDetails);
          return db.doc(`/mobile timeline/${newsId}`).get();
        })
        .then(async (d) => {
          if (d.exists)
            await db.doc(`/mobile timeline/${newsId}`).update(postDetails);
          return res.json({ message: 'Post updated successfully' });
        })
        .catch((err) => {
          res.status(500).json({ error: 'something went wrong' });
          console.error(err);
        });
    });
    busboy.end(req.rawBody);
  }
};

