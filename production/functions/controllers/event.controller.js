const { admin, db } = require('../utils/admin');
const config = require("../utils/database");
const { uuid } = require('uuidv4');
const sgMail = require('@sendgrid/mail');

exports.getAllEvents = (req, res) => {
  db.collection('events')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let events = [];
      data.forEach((doc) => {
        events.push({
          eventId: doc.id,
          title: doc.data().title,
          slug: doc.data().slug,
          host: doc.data().host,
          start_date: doc.data().start_date,
          endDate: doc.data().endDate,
          category: doc.data().category,
          time: doc.data().time,
          endTime: doc.data().endTime,
          shortDescription: doc.data().shortDescription,
          description: doc.data().description,
          location: doc.data().location,
          createdAt: doc.data().createdAt,
          registerLink: doc.data().registerLink,
          website: doc.data().website,
          eventMediaUrl: doc.data().eventMediaUrl,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          imageUrl: doc.data().imageUrl,
          username: doc.data().username,
          userId: doc.data().userId,
          viewsCount: doc.data().viewsCount,
          isPartner: doc.data().isPartner,
        });
      });
      return res.json(events);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.createEvent = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  
  const busboy = new BusBoy({ headers: req.headers });
  const imageUrl = req.user.imageUrl
  const userId = req.user.userId
  const username = req.user.username
  const isPartner = req.user.isPartner;
  let docId;

  let imageToBeUploaded = {};
  let imageFileName;
  let generatedToken = uuid();
  let newEvent = {};

  const adminMsg = {
    to: 'admin@levls.io', // recipient
    from: 'LEVLS. <noreply@levls.io>',
    subject: `New Event - ${req.body.title}`,
    text: `${
      req.user.organisationName || req.body.username
    }, just created an event`,
    html: `
        <h3> Hello Admin </h3>
        <p>A new event has been created by ${
          req.user.organisationName || req.user.username
        }. Please review and activate </p>

        <a href=https://justappli-b9f5c.web.app/admin/events/"> Visit </a>
        <p>Thank You.</p>
        <p>LEVLS</p>
      `,
  };
  

  busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
    // console.log('Field [' + fieldname + ']: value: ' + inspect(val));
    newEvent[fieldname] = val
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
        destination: `events/${imageFileName}`,
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
      newEvent.title
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-') +
      '-' +
      Date.parse(post_time_stamp);
    const eventMediaUrl = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/events%2F${imageFileName}?alt=media&token=${generatedToken}`;
    newEvent.eventMediaUrl = eventMediaUrl;
    newEvent.userId = userId;
    newEvent.username = username;
    newEvent.slug = slug;
    newEvent.contentType = 'event';
    newEvent.imageUrl = imageUrl;
    newEvent.createdAt = new Date().toISOString();
    newEvent.post_time_stamp = Date.parse(post_time_stamp)
    newEvent.likeCount = 0
    newEvent.commentCount = 0
    newEvent.viewsCount = 0
    newEvent.isActive = false
    newEvent.isPartner = isPartner
    newEvent.pageUrl = `events/${slug}`;
    db.collection('events')
      .add(newEvent)
      .then((doc) => {
        const resEvent = newEvent;
        resEvent.timelineId = doc.id;
        docId = doc.id
      })
      .then(async () => {
        await db.doc(`mobile timeline/${docId}`).set(resEvent);
        await sgMail.send(adminMsg);
        return res.status(201).json(resEvent);
      })
      .catch((err) => {
        res.status(500).json({ error: 'something went wrong' });
        console.error(err);
      });
  });

  busboy.end(req.rawBody);
};

// Fetch one event
exports.getEvent = (req, res) => {
  let eventData = {};
  db.collection('events')
    .where('slug', '==', req.params.slug)
    .get()
    .then((data) => {
      if (data.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      data.forEach((doc) => {
        eventData = doc.data();
        eventData.eventId = doc.id;
        doc.ref.update({ viewsCount: doc.data().viewsCount + 1 });
      });
      
      return res.json(eventData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Update Event details
exports.updateEventDetails = (req, res) => {
  let eventDetails = reduceEventDetails(req.body);
  const eventDocument = db.doc(`/events/${req.params.eventId}`)

  eventDocument
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Event not found' });
      }
      eventDocument.update(eventDetails)
      return db.doc(`/mobile timeline/${req.params.eventId}`).update(eventDetails);
      
    })
    .then(() => {
      return res.json({ message: "Event updated successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Delete an event
exports.deleteEvent = (req, res) => {
  const document = db.doc(`/events/${req.params.eventId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Event not found' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'Event deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.likeEvent = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.eventId}`)
  const likeDocument = db
    .collection('likes')
    .where('userId', '==', req.user.userId)
    .where('eventId', '==', req.params.eventId)
    .limit(1);

  const eventDocument = db.doc(`/events/${req.params.eventId}`);

  let eventData;
  let hostId;
  let mobTimelineData;

  eventDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        eventData = doc.data();
        eventData.eventId = doc.id;
        hostId = eventData.userId
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'Event not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection('likes')
          .add({
            eventId: req.params.eventId,
            username: req.user.username,
            userId: req.user.userId,
            createdAt: new Date().toISOString(),
            hostId: hostId,
            imageUrl: req.user.imageUrl
          })
          .then(() => {
            eventData.likeCount++;
            eventDocument.update({ likeCount: eventData.likeCount });
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
            return res.json(eventData);
          });
      } else {
        return res.status(400).json({ error: 'Event already liked' });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.unLikeEvent = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.eventId}`)
  const likeDocument = db
    .collection('likes')
    .where('userId', '==', req.user.userId)
    .where('eventId', '==', req.params.eventId)
    .limit(1);

  const eventDocument = db.doc(`/events/${req.params.eventId}`);

  let eventData;
  let mobTimelineData;

  eventDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        eventData = doc.data();
        eventData.eventId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'Event not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: 'Event not liked' });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            eventData.likeCount--;
            eventDocument.update({ likeCount: eventData.likeCount });
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
            return res.json(eventData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.commentOnEvent = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.eventId}`)
  if (req.body.body.trim() === '')
    return res.status(400).json({ comment: 'Must not be empty' });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    eventId: req.params.eventId,
    mobPostId: req.params.eventId,
    username: req.user.username,
    userId: req.user.userId,
    userImage: req.user.imageUrl,
    edited: false 
  };

  db.doc(`/events/${req.params.eventId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {        
        return res.status(404).json({ error: 'Event not found' });
      }
      newComment.hostId = doc.data().userId;
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
exports.deleteEventComment = (req, res) => {
  const decrement = admin.firestore.FieldValue.increment(-1);
  const commentDoc = db.doc(`/comments/${req.params.commentId}`);
  let timeLineDoc;
  let eventDoc;
  let eventId;
  const batch = db.batch();

  commentDoc
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Comment not found' });
      } else {
        eventId = doc.data().eventId
        eventDoc = db.doc(`/events/${eventId}`)
        timeLineDoc = db.doc(`/mobile timeline/${eventId}`);
        return commentDoc.delete();
      }
    })
    .then(() => {
      batch.set(eventDoc, { commentCount: decrement }, { merge: true });
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


