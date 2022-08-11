const { admin, db } = require('../utils/admin');
const config = require("../utils/database");
const { uuid } = require('uuidv4');
const sgMail = require('@sendgrid/mail');

// Fetch all resources
exports.getAllResources = (req, res) => {
  db.collection('resources')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let resources = [];
      data.forEach((doc) => {        
        resources.push(
          {
          ...doc.data(),
          resourceId: doc.id,
          //   title: doc.data().title,
          //   shortDescription: doc.data().shortDescription,
          //   slug: doc.data().slug,
          //   content: doc.data().content,
          //   username: doc.data().username,
          //   createdAt: doc.data().createdAt,
          //   uploadUrl: doc.data().uploadUrl,
          //   contentType: doc.data().contentType,
          //   isActive: doc.data().isActive,
          //   likeCount: doc.data().likeCount,
          //   commentCount: doc.data().commentCount,
          //   viewsCount: doc.data().viewsCount,
          //   resourceType: doc.data().resourceType,
          }
        );
        
      });
      
      return res.json(resources);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong please try again.' });
    });
};

exports.getAllOrgResources = (req, res) => {
  db.collection('resources')
    .where('userId', '==', req.params.userId)
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let resources = [];
      data.forEach((doc) => {
        resources.push(
        {
          ...doc.data(),
          resourceId: doc.id,
        //   title: doc.data().title,
        //   shortDescription: doc.data().shortDescription,
        //   slug: doc.data().slug,
        //   content: doc.data().content,
        //   username: doc.data().username,
        //   userId: doc.data().userId,
        //   imageUrl: doc.data().imageUrl,
        //   createdAt: doc.data().createdAt,
        //   uploadUrl: doc.data().uploadUrl,
        //   contentType: doc.data().contentType,
        //   isActive: doc.data().isActive,
        //   likeCount: doc.data().likeCount,
        //   commentCount: doc.data().commentCount,
        //   viewsCount: doc.data().viewsCount,
        //   resourceType: doc.data().resourceType,
          }
        );
        
      });
      
      return res.json(resources);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong please try again.' });
    });
};


// Create Resource
exports.createResource = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  let docId;
  let resResource;

  if (req.body.customUrl) {
    if (req.body.content.trim() === '') {
      return res.status(400).json({ error: 'Content must not be empty' });
    }
    if (req.body.shortDescription.trim() === '') {
      return res.status(400).json({ error: 'Short description must not be empty' });
    }
    if (req.body.title.trim() === '') {
      return res.status(400).json({ error: 'Title must not be empty' });
    }
    if (req.body.customUrl.trim() === '') {
      return res.status(400).json({ error: 'Url must not be empty' });
    }

    const adminMsg = {
      to: 'admin@levls.io', // recipient
      from: 'LEVLS. <noreply@levls.io>',
      subject: `New Resource - ${req.body.title}`,
      text: `${
        req.user.organisationName || req.body.username
      }, just created a resource`,
      html: `
        <h3> Hello Admin </h3>
        <p>A new resource has been created by ${
          req.user.organisationName || req.user.username
        }. Please review and activate </p>

        <a href=https://justappli-b9f5c.web.app/admin/resources/"> Visit </a>
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

    const newResource = {
      uploadUrl: req.body.customUrl,
      title: req.body.title,
      shortDescription: req.body.shortDescription,
      slug,
      content: req.body.content,
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: req.user.username,
      userId: req.user.userId,
      imageUrl: req.user.imageUrl,
      likeCount: 0,
      commentCount: 0,
      contentType: 'resources',
      isActive: false,
      viewsCount: 0,
      resourceType: req.body.resourceType,
      pageUrl: `resources/${slug}`,
      state: 'draft',
      //registerLink: req.body.registerLink || ''
    };

    db.collection('resources')
        .add(newResource)
        .then((doc) => {
          resResource = newResource;
          resResource.timelineId = doc.id;
          docId = doc.id
        })
        .then(async () => {
          await db.doc(`mobile timeline/${docId}`).set(resResource)
          await sgMail.send(adminMsg);
          return res.status(201).json(resResource);
          
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
    let newResource = {};

    const adminMsg = {
      to: 'admin@levls.io', // recipient
      from: 'LEVLS. <noreply@levls.io>',
      subject: `New Resource - ${req.body.title}`,
      text: `${
        req.user.organisationName || req.body.username
      }, just created a resource`,
      html: `
        <h3> Hello Admin </h3>
        <p>A new resource has been created by ${
          req.user.organisationName || req.user.username
        }. Please review and activate </p>

        <a href=https://justappli-b9f5c.web.app/admin/resources/"> Visit </a>
        <p>Thank You.</p>
        <p>LEVLS</p>
      `,
    };


    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
      // console.log('Field [' + fieldname + ']: value: ' + inspect(val));
      newResource[fieldname] = val
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
          destination: `resources/${imageFileName}`,
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
        newResource.title
          .toLowerCase()
          .replace(/[^\w ]+/g, '')
          .replace(/ +/g, '-') +
        '-' +
        Date.parse(post_time_stamp);
      const uploadUrl = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/resources%2F${imageFileName}?alt=media&token=${generatedToken}`;
      newResource.uploadUrl = uploadUrl;
      newResource.userId = userId;
      newResource.username = username;
      newResource.slug = slug;
      newResource.contentType = 'resources';
      newResource.isActive = false;
      newResource.imageUrl = imageUrl;
      newResource.createdAt = new Date().toISOString();
      newResource.post_time_stamp = Date.parse(post_time_stamp)
      newResource.likeCount = 0
      newResource.commentCount = 0
      newResource.viewsCount = 0
      newResource.pageUrl = `resources/${slug}`
      newResource.state = 'draft'
      db
        .collection('resources')
        .add(newResource)
        .then((doc) => {
          resResource = newResource;
          resResource.timelineId = doc.id;
          docId = doc.id;
        })
        .then(async () => {
          await db.doc(`mobile timeline/${docId}`).set(resResource);
          await sgMail.send(adminMsg);
          return res.status(201).json(resResource);
        })
        .catch((err) => {
          res.status(500).json({ error: 'something went wrong' });
          console.error(err);
        });
    });

    busboy.end(req.rawBody);
  }
  
};

// Fetch one resource
exports.getResource = (req, res) => {
  let resourceData = {};

  db.collection('resources')
    .where('slug', '==', req.params.slug)
    .get()
    .then((data) => {
      if (data.length === 0) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      data.forEach((doc) => {
        resourceData = doc.data();
        resourceData.resourceId = doc.id;
        doc.ref.update({ viewsCount: doc.data().viewsCount + 1 });
      });
      
      return res.json(resourceData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Comment on a resource
exports.commentOnResource = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.resourceId}`)
  if (req.body.comment.trim() === '')
    return res.status(400).json({ comment: 'Must not be empty' });

  const newComment = {
    comment: req.body.comment,
    createdAt: new Date().toISOString(),
    resourceId: req.params.resourceId,
    mobPostId: req.params.resourceId,
    username: req.user.username,
    userImage: req.user.imageUrl,
    userId: req.user.userId,
    edited: false
  };
  console.log(newComment);

  db.doc(`/resources/${req.params.resourceId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      newComment.resourceOwnerId = doc.data().userId;
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
exports.deleteResourceComment = (req, res) => {
  const decrement = admin.firestore.FieldValue.increment(-1);  
  const commentDoc = db.doc(`/comments/${req.params.commentId}`);
  let resourceId;
  let timeLineDoc;
  let resourceDoc;
  const batch = db.batch();

  commentDoc
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Comment not found' });
      } else {
        resourceId = doc.data().resourceId
        resourceDoc = db.doc(`/resources/${resourceId}`);
        timeLineDoc = db.doc(`/mobile timeline/${resourceId}`);
        return commentDoc.delete();
      }
    })
    .then(() => {
      batch.set(resourceDoc, { commentCount: decrement }, { merge: true });
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


// Like a resource
exports.likeResource = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.resourceId}`)
  const likeDocument = db
    .collection('likes')
    .where('userId', '==', req.user.userId)
    .where('resourceId', '==', req.params.resourceId)
    .limit(1);

  const resourceDocument = db.doc(`/resources/${req.params.resourceId}`);

  let resourceData;
  let resourceOwnerId;
  let mobTimelineData;

  resourceDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        resourceData = doc.data();
        resourceData.resourceId = doc.id;
        resourceOwnerId = resourceData.userId
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
            resourceId: req.params.resourceId,
            username: req.user.username,
            userId: req.user.userId,
            createdAt: new Date().toISOString(),
            resourceOwnerId: resourceOwnerId,
            imageUrl: req.user.imageUrl
          })
          .then(() => {
            resourceData.likeCount++;
            resourceDocument.update({ likeCount: resourceData.likeCount });
            return mobTimelineDoc.get();
          })
          .then((doc) => {
            if (!doc.exists) {        
              return res.status(404).json({ error: 'Mobile content not found' });
            }
            mobTimelineData = doc.data();
            mobTimelineData.likeCount++;
            return mobTimelineDoc.update({
              likeCount: mobTimelineData.likeCount,
            });
          })
          .then(() => {
            return res.json(resourceData);
          });
      } else {
        return res.status(400).json({ error: 'Resource already liked' });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Unlike a resource
exports.unLikeResource = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.resourceId}`)
  const likeDocument = db
    .collection('likes')
    .where('userId', '==', req.user.userId)
    .where('resourceId', '==', req.params.resourceId)
    .limit(1);

  const resourceDocument = db.doc(`/resources/${req.params.resourceId}`);

  let resourceData;
  let mobTimelineData;

  resourceDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        resourceData = doc.data();
        resourceData.resourceId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'Resource not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: 'Resource not liked' });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            resourceData.likeCount--;
            resourceDocument.update({ likeCount: resourceData.likeCount });
            return mobTimelineDoc.get();
          })
          .then((doc) => {
            if (!doc.exists) {        
              return res.status(404).json({ error: 'Mobile content not found' });
            }
            mobTimelineData = doc.data();
            mobTimelineData.likeCount--;
            return mobTimelineDoc.update({
              likeCount: mobTimelineData.likeCount,
            });
          })
          .then(() => {
            res.json(resourceData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};


// Delete a resource
exports.deleteResource = (req, res) => {
  const document = db.doc(`/resources/${req.params.resourceId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Resource not found' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'The Resource was deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


// Update resource data
exports.updateResource = (req, res) => {
  let resourceDetails = req.body;
  const resourceDocument = db.doc(`/resources/${req.params.resourceId}`)

  resourceDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      resourceDocument.update(resourceDetails)
      return db.doc(`/mobile timeline/${req.params.resourceId}`).update(resourceDetails);
      
    })
    .then(() => {
      return res.json({ message: "Resource updated successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


