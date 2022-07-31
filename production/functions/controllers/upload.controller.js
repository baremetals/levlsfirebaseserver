const { admin, db } = require("../utils/admin");
const config = require("../utils/database");
const { v4 } = require('uuid');



exports.deleteUpload = (req, res) => {
    const uploadDoc = db.doc(`/uploads/${req.params.uploadId}`);
    uploadDoc
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Upload not found' });
        } else {
          return uploadDoc.delete();
        }
      })
      .then(() => {
        return db.doc(`/mobile timeline/${req.params.uploadId}`).delete();
      })
      .then(() => {
        return res.json({ message: 'Upload deleted successfully' });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
}

exports.likeAnUpload = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.uploadId}`)
    const likeDocument = db
      .collection('likes')
      .where('userId', '==', req.user.userId)
      .where('uploadId', '==', req.params.uploadId)
      .limit(1);
  
    const uploadDocument = db.doc(`/uploads/${req.params.uploadId}`);
  
    let uploadData;
    let mobTimelineData;
    let uploadOwnerId;
  
    uploadDocument
      .get()
      .then((doc) => {
        if (doc.exists) {
          uploadData = doc.data();
          uploadData.uploadId = doc.id;
          uploadOwnerId = uploadData.userId
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
              uploadId: req.params.uploadId,
              username: req.user.username,
              userId: req.user.userId,
              createdAt: new Date().toISOString(),
              uploadOwnerId: uploadOwnerId,
              imageUrl: req.user.imageUrl
            })
            .then(() => {
              uploadData.likeCount++;
              uploadDocument.update({ likeCount: uploadData.likeCount });
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
              return res.json(uploadData);
            });
        } else {
          return res.status(400).json({ error: 'Upload already liked' });
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
};

exports.unLikeAnUpload = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.uploadId}`)
    const likeDocument = db
      .collection('likes')
      .where('userId', '==', req.user.userId)
      .where('uploadId', '==', req.params.uploadId)
      .limit(1);
  
    const uploadDocument = db.doc(`/uploads/${req.params.uploadId}`);
  
    let uploadData;
    let mobTimelineData;
  
    uploadDocument
      .get()
      .then((doc) => {
        if (doc.exists) {
          uploadData = doc.data();
          uploadData.uploadId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({ error: 'Upload not found' });
        }
      })
      .then((data) => {
        if (data.empty) {
          return res.status(400).json({ error: 'Upload not liked' });
        } else {
          return db
            .doc(`/likes/${data.docs[0].id}`)
            .delete()
            .then(() => {
              uploadData.likeCount--;
              uploadDocument.update({ likeCount: uploadData.likeCount });
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
              res.json(uploadData);
            });
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
};

exports.commentOnAnUpload = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.uploadId}`)
    if (req.body.comment.trim() === '')
      return res.status(400).json({ comment: 'Must not be empty' });
  
    const newComment = {
      comment: req.body.comment,
      createdAt: new Date().toISOString(),
      uploadId: req.params.uploadId,
      mobPostId: req.params.uploadId,
      username: req.user.username,
      userId: req.user.userId,
      userImage: req.user.imageUrl,
      edited: false 
    };
  
    db.doc(`/uploads/${req.params.uploadId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {        
          return res.status(404).json({ error: 'Upload not found' });
        }
        newComment.uploadOwnerId = doc.data().userId;
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

exports.deleteUploadComment = (req, res) => {
  const decrement = admin.firestore.FieldValue.increment(-1);
  const commentDoc = db.doc(`/comments/${req.params.commentId}`);
  let uploadId;
  let timeLineDoc;
  let uploadDoc;
  const batch = db.batch();

  commentDoc
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Comment not found' });
      } else {
        uploadId = doc.data().uploadId
        uploadDoc = db.doc(`/uploads/${uploadId}`);
        timeLineDoc = db.doc(`/mobile timeline/${uploadId}`);
        return commentDoc.delete();
      }
    })
    .then(() => {
      batch.set(uploadDoc, { commentCount: decrement }, { merge: true });
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

exports.userUploads = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  
  let docId;
  let resUpload;
  let uploadUrl;

  if (req.body.customUrl || req.body.customUrl === "") {
    const newUpload = {
      uploadUrl: req.body.customUrl || "",
      caption: req.body.caption || "",
      title: req.body.title || "",
      description: req.body.description || "",
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: req.user.username,
      userId: req.user.userId,
      imageUrl: req.user.imageUrl,
      likeCount: 0,
      commentCount: 0,
      contentType: 'upload',
      uploadType: req.body.uploadType,
      videoViewsCount: 0,
      uploadThumbnail: req.body.uploadThumbnail || "",
      
    };

    db.collection('uploads')
      .add(newUpload)
      .then((doc) => {
        resUpload = newUpload;
        resUpload.timelineId = doc.id;
        resUpload.pageUrl = `upload/${doc.id}`;
        docId = doc.id
      })
      .then(() => {
        db.doc(`mobile timeline/${docId}`).set(resUpload)
        return res.json(resUpload);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });

  } else {

    const busboy = new BusBoy({ headers: req.headers });
    const username = req.user.username;
    const userId = req.user.userId;
    const imageUrl = req.user.imageUrl;

    let contentToBeUploaded = {};
    let uploadFileName;
    let generatedToken = v4();
    let newUpload = {};


    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
      newUpload[fieldname] = val
    });


    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      if (mimetype !== "image/jpeg" && mimetype !== "image/jpg" && mimetype !== "image/png" && mimetype !== "image/gif"
      && mimetype !== "video/mp4" && mimetype !== "video/swf" && mimetype !== "application/pdf" && mimetype !== "application/msword") {
        return res.status(400).json({ error: "Wrong file type submitted" });
      }
      const contentExtension = filename.split(".")[filename.split(".").length - 1];
      // 32756238461724837.png
      uploadFileName = `${Math.round(
        Math.random() * 1000000000000
      ).toString()}.${contentExtension}`;
      const filepath = path.join(os.tmpdir(), path.basename(uploadFileName));
      contentToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
      
  });

  busboy.on("finish", async () => {
    let promise;
    uploadUrl = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/uploads%2F${uploadFileName}?alt=media&token=${generatedToken}`;
      promise = admin
      .storage()
      .bucket(config.storageBucket)
      .upload(contentToBeUploaded.filepath, {
        destination: `uploads/${uploadFileName}`,
        resumable: false,
        metadata: {
          metadata: {
            contentType: contentToBeUploaded.mimetype,
            //Generate token to be appended to imageUrl
            firebaseStorageDownloadTokens: generatedToken,
          },
        }, 
      })

    try {
      await Promise.resolve(promise);

      newUpload.uploadUrl = uploadUrl;
      newUpload.createdAt = new Date().toISOString();
      newUpload.post_time_stamp = Date.parse(post_time_stamp)
      newUpload.username = username;
      newUpload.userId = userId;
      newUpload.imageUrl = imageUrl;
      newUpload.likeCount = 0
      newUpload.commentCount = 0
      newUpload.videoViewsCount = 0
      newUpload.contentType = 'upload';
      newUpload.title = '';
      newUpload.description = '';
      db.collection('uploads')
        .add(newUpload)
        .then((doc) => {
          resUpload = newUpload;
          resUpload.timelineId = doc.id;
          resUpload.pageUrl = `upload/${doc.id}`;
          docId = doc.id
        })
        .then(() => {
          db.doc(`mobile timeline/${docId}`).set(resUpload)
          return res.json(resUpload);
        })
        .catch((err) => {
          res.status(500).json({ error: 'something went wrong' });
          console.error(err);
        });
    } catch (err) {
      res.status(500).json({ error: 'something went wrong' });
      console.error(err);
    }
  });
    busboy.end(req.rawBody);
  }
}

exports.updateUploadDetails = (req, res) => {
  let uploadDetails = req.body;
  const uploadDocument = db.doc(`/uploads/${req.params.uploadId}`)

  uploadDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Upload not found' });
      }
      uploadDocument.update(uploadDetails)
      return db.doc(`/mobile timeline/${req.params.uploadId}`).update(uploadDetails);
      
    })
    .then(() => {
      return res.json({ message: "Details updated successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.uploadMetaData = (req,  res) => {
  const ogs = require('open-graph-scraper');
  const options = { url: req.body.url };
  ogs(options)
    .then((data) => {
      const { error, result, response } = data;
      return res.json(result)
    })
    .catch((err) => {
      console.log(err)
    })
}

// Fetch one upload
exports.getAnUpload = (req, res) => {
  let uploadData = {};

  db.doc(`/uploads/${req.params.uploadId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        uploadData.credentials = doc.data();
        return res.status(201).json(uploadData);
      }
      return res.status(404).json({ error: 'Upload not found' });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};