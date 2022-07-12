const { admin, db } = require("../utils/admin");
const sgMail = require('@sendgrid/mail')
const config = require("../utils/database");
const { uuid } = require('uuidv4');


const firebase = require("firebase");
// firebase.initializeApp(config);

const {
    // validateSignupData,
    validateLoginData,
    // reduceUserDetails,
    // validateEmailData,
    // validatePasswordChange
} = require("../utils/validators");

exports.adminLogin = (req, res) => {
    const user = {
      email: req.body.email,
      password: req.body.password,
    };

    let userDoc;
    const getUser = db
      .collection('users')
      .where('email', '==', user.email)
      .limit(1);

  
    const { valid, errors } = validateLoginData(user);
  
    if (!valid) return res.status(400).json(errors);

    getUser
      .get()
      .then((data) => {
        if (data) {;
          data.forEach((doc) => {
            userDoc = doc.data();
          });
          return userDoc;
        }
      })
      .then(() => {
        if (userDoc.verified !== true) {
          return res.status(403).json({
            error:
              'Please activate this account, check your email for the activation link.',
          });
        } else {
          if (userDoc.isAdmin === true) {;
            return firebase
              .auth()
              .signInWithEmailAndPassword(user.email, user.password)
              .then((data) => {
                return data.user.getIdToken();
              })
              .then((token) => {;
                return res.json({ token });
              })
              .catch((err) => {;
                console.error(err);
                if (err.code.startsWith('auth')) {
                  return res.status(403).json({
                    error: 'wrong email or password, please try again',
                  });
                } else {
                  return res
                    .status(403)
                    .json({ error: 'wrong credentials, please try again' });
                }
              });
          } else {
            return res
              .status(403)
              .json({ error: 'Yo do not have the right permission to access this route!' });
          }
        }
      })
      .catch((err) => {
        console.error(err);
        return res
          .status(403)
          .json({ general: "Sorry Something Went Wrong" });
      });
};

// Get Admin user details
exports.getAdminUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.userId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return res.json(userData);
      }
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.contactUs = (req, res) => {
  const contact = {
    name: req.body.name,
    email: req.body.email,
    enquiry: req.body.enquiry,
    comment: req.body.comment
  }

  // db.collection('contact us').add(contact)

    const msg = {
      to: `${contact.email}`, // recipient
      from: 'noreply@levls.io', // Change to verified sender
      subject: 'Contact us',
      text: 'We received your message.',
      html: `
        <h3> Hello ${contact.name} </h3>
        <p>Thank you for reaching out. ...</p>
        <p>We endeavour to get back to you within 48 hours.</p>
        <p>Thank You.</p>
        <p>LEVLS Team</p>
      `,
    };
    sgMail
      .send(msg)
      .then(() => {        
        console.log('Email sent')
        return res.status(201).json({ success: 'email was sent successfully' })
      })
      .catch((error) => {
        console.error(error)
      })
}

// Fetch all apprenticeships
exports.adminGetAllApprenticeships = (_req, res) => {
  db.collection('apprenticeships')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let apprenticeships = [];
      data.forEach((doc) => {
        apprenticeships.push({
          apprenticeshipId: doc.id,
          title: doc.data().title,
          shortDescription: doc.data().shortDescription,
          slug: doc.data().slug,
          content: doc.data().content,
          location: doc.data().location,
          howtoApply: doc.data().howtoApply,
          username: doc.data().username,
          userId: doc.data().userId,
          imageUrl: doc.data().imageUrl,
          createdAt: doc.data().createdAt,
          contentType: doc.data().contentType,
          deadline: doc.data().deadline,
          organisationName: doc.data().organisationName,
          applicationLink: doc.data().applicationLink,
          jobType: doc.data().jobType,
          isActive: doc.data().isActive,
          viewsCount: doc.data().viewsCount,
        });
      });

      return res.json(apprenticeships);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong please try again.' });
    });
};

// Create an apprenticeship
exports.adminCreateAnApprenticeship = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  if (req.body.content.trim() === '') {
    return res.status(400).json({ error: 'Content must not be empty' });
  }
  if (req.body.title.trim() === '') {
    return res.status(400).json({ error: 'Title must not be empty' });
  }
  if (req.body.shortDescription.trim() === '') {
    return res.status(400).json({ error: 'Short description must not be empty' });
  }

  let resApprentice;
  let docId;

  if (!req.user.isAdmin) {
    return res.status(400).json({ error: 'You are not permitted' });
  } else {
    const slug =
      req.body.title
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-') +
      '-' +
      Date.parse(post_time_stamp);

    const newApprentice = {
      title: req.body.title,
      shortDescription: req.body.shortDescription,
      content: req.body.content,
      slug,
      jobType: req.body.jobType,
      location: req.body.location,
      deadline: req.body.deadline || '',
      howtoApply: req.body.howtoApply,
      applicationLink: req.body.applicationLink || '',
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: 'levls',
      userId: config.levlsUserId,
      imageUrl: config.levlsLogoUrl,
      organisationName: req.body.organisationName || '',
      contentType: 'apprenticeship',
      isActive: true,
      applicantCount: 0,
    };

    db.collection('apprenticeships')
      .add(newApprentice)
      .then((doc) => {
        resApprentice = newApprentice;
        resApprentice.opportunityId = doc.id;
        resApprentice.timelineId = doc.id;
        docId = doc.id;
      })
      .then(async () => {
        await db.doc(`opportunities/${docId}`).set(resApprentice);
        await db.doc(`mobile timeline/${docId}`).set(resApprentice);
        return res.json(resApprentice);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
  }
};

// Activate apprenticeship data
exports.adminActivateOrDisableApprenticeship = (req, res) => {
  const isActive = req.body
  const apprenticeshipDoc = db.doc(`/apprenticeships/${req.params.apprenticeshipId}`)

  apprenticeshipDoc
    .get()
    .then(async(doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Apprenticeship not found' });
      }
      await apprenticeshipDoc.update(isActive);
      await db
        .doc(`/mobile timeline/${req.params.apprenticeshipId}`)
        .update(isActive);
      await db
        .doc(`/opportunities/${req.params.apprenticeshipId}`)
        .update(isActive);
    })
    .then(() => {
      return res
        .status(201)
        .json({ message: 'Apprenticeship activated successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Fetch all internships
exports.adminGetAllInternships = (_req, res) => {
  db.collection('internships')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let internships = [];
      data.forEach((doc) => {
        internships.push({
          internshipId: doc.id,
          title: doc.data().title,
          shortDescription: doc.data().shortDescription,
          slug: doc.data().slug,
          content: doc.data().content,
          location: doc.data().location,
          howtoApply: doc.data().howtoApply,
          username: doc.data().username,
          userId: doc.data().userId,
          imageUrl: doc.data().imageUrl,
          organisationName: doc.data().organisationName,
          createdAt: doc.data().createdAt,
          contentType: doc.data().contentType,
          applicationLink: doc.data().applicationLink,
          jobType: doc.data().jobType,
          deadline: doc.data().deadline,
          isActive: doc.data().isActive,
          viewsCount: doc.data().viewsCount,
        });
      });
      return res.json(internships);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong please try again.' });
    });
};


// Create Internship
exports.adminCreateAnInternship = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  if (req.body.content.trim() === '') {
    return res.status(400).json({ error: 'Content must not be empty' });
  }
  if (req.body.title.trim() === '') {
    return res.status(400).json({ error: 'Title must not be empty' });
  }
  if (req.body.shortDescription.trim() === '') {
    return res
      .status(400)
      .json({ error: 'Short description  must not be empty' });
  }

  let resInternship;
  let docId;

  if (!req.user.isAdmin) {
    return res.status(400).json({ error: 'You are not permitted' });
  } else {
    const slug =
      req.body.title
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-') +
      '-' +
      Date.parse(post_time_stamp);

    const newInternship = {
      title: req.body.title,
      shortDescription: req.body.shortDescription,
      content: req.body.content,
      slug,
      jobType: req.body.jobType,
      location: req.body.location,
      deadline: req.body.deadline || '',
      applicationLink: req.body.applicationLink || '',
      howtoApply: req.body.howtoApply || '',
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: 'levls',
      userId: config.levlsUserId,
      imageUrl: config.levlsLogoUrl,
      organisationName: req.body.organisationName || '',
      contentType: 'internship',
      isActive: true,
      applicantCount: 0,
    };

    db.collection('internships')
      .add(newInternship)
      .then((doc) => {
        resInternship = newInternship;
        resInternship.opportunityId = doc.id;
        resInternship.timelineId = doc.id;
        docId = doc.id;
      })
      .then(async () => {
        await db.doc(`opportunities/${docId}`).set(resInternship);
        await db.doc(`mobile timeline/${docId}`).set(resInternship);
        return res.json(resInternship);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
  }
};

// Fetch all grants
exports.adminGetAllGrants = (_req, res) => {
  db.collection('grants')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let grants = [];
      data.forEach((doc) => {
        grants.push({
          grantId: doc.id,
          title: doc.data().title,
          category: doc.data().category,
          shortDescription: doc.data().shortDescription,
          slug: doc.data().slug,
          content: doc.data().content,
          region: doc.data().region,
          location: doc.data().location,
          howtoApply: doc.data().howtoApply,
          username: doc.data().username,
          userId: doc.data().userId,
          imageUrl: doc.data().imageUrl,
          createdAt: doc.data().createdAt,
          grantType: doc.data().grantType,
          closingDate: doc.data().closingDate,
          organisationName: doc.data().organisationName,
          applicationLink: doc.data().applicationLink,
          isActive: doc.data().isActive,
          viewsCount: doc.data().viewsCount,
        });
      });

      return res.json(grants);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong please try again.' });
    });
};

// Create an grant
exports.adminCreateAGrant = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  if (req.body.content.trim() === '') {
    return res.status(400).json({ error: 'Content must not be empty' });
  }
  if (req.body.title.trim() === '') {
    return res.status(400).json({ error: 'Title must not be empty' });
  }
  if (req.body.shortDescription.trim() === '') {
    return res
      .status(400)
      .json({ error: 'Short description must not be empty' });
  }

  let resGrant;
  let docId;

  if (!req.user.isAdmin) {
    return res.status(400).json({ error: 'You are not permitted' });
  } else {
    const slug =
      req.body.title
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-') +
      '-' +
      Date.parse(post_time_stamp);

    const newGrant = {
      title: req.body.title,
      shortDescription: req.body.shortDescription,
      content: req.body.content,
      slug,
      category: req.body.category || '',
      grantType: req.body.grantType,
      location: req.body.location,
      region: req.body.region,
      closingDate: req.body.closingDate || '',
      applicationLink: req.body.applicationLink || '',
      howtoApply: req.body.howtoApply || '',
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: 'levls',
      userId: config.levlsUserId,
      imageUrl: config.levlsLogoUrl,
      organisationName: req.body.organisationName || '',
      contentType: 'grants',
      isActive: true,
      applicantCount: 0,
    };

    db.collection('grants')
      .add(newGrant)
      .then((doc) => {
        resGrant = newGrant;
        resGrant.opportunityId = doc.id;
        resGrant.timelineId = doc.id;
        docId = doc.id;
      })
      .then(async () => {
        await db.doc(`opportunities/${docId}`).set(resGrant);
        await db.doc(`mobile timeline/${docId}`).set(resGrant);
        return res.json(resGrant);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
  }
};

// Create Resource
exports.adminCreateResource = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  let docId;
  let resResource;

  if (req.body.customUrl) {
    if (req.body.content.trim() === '') {
      return res.status(400).json({ error: 'Content must not be empty' });
    }
    if (req.body.shortDescription.trim() === '') {
      return res
        .status(400)
        .json({ error: 'Short description must not be empty' });
    }
    if (req.body.title.trim() === '') {
      return res.status(400).json({ error: 'Title must not be empty' });
    }
    if (req.body.customUrl.trim() === '') {
      return res.status(400).json({ error: 'Url must not be empty' });
    }

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
      username: 'levls',
      userId: config.levlsUserId,
      imageUrl: config.levlsLogoUrl,
      likeCount: 0,
      commentCount: 0,
      contentType: 'resources',
      isActive: true,
      viewsCount: 0,
      resourceType: req.body.resourceType,
      //registerLink: req.body.registerLink || ''
    };

    db.collection('resources')
      .add(newResource)
      .then((doc) => {
        resResource = newResource;
        resResource.timelineId = doc.id;
        docId = doc.id;
      })
      .then(() => {
        db.doc(`mobile timeline/${docId}`).set(resResource);
        return res.json(resResource);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
  } else {
    const busboy = new BusBoy({ headers: req.headers });
    const imageUrl = config.levlsLogoUrl;
    const userId = config.levlsUserId;
    const username = 'levls';

    let imageToBeUploaded = {};
    let imageFileName;
    let generatedToken = uuid();
    let newResource = {};

    busboy.on(
      'field',
      function (
        fieldname,
        val,
        fieldnameTruncated,
        valTruncated,
        encoding,
        mimetype
      ) {
        // console.log('Field [' + fieldname + ']: value: ' + inspect(val));
        newResource[fieldname] = val;
      }
    );

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      if (
        mimetype !== 'image/jpeg' &&
        mimetype !== 'image/jpg' &&
        mimetype !== 'image/png' &&
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
          res
            .status(500)
            .json({
              error: 'Erm... That was strange, please try again later! ',
            });
          console.error(err);
        });
    });

    busboy.on('finish', () => {
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
      newResource.isActive = true;
      newResource.imageUrl = imageUrl;
      newResource.createdAt = new Date().toISOString();
      newResource.post_time_stamp = Date.parse(post_time_stamp);
      newResource.likeCount = 0;
      newResource.commentCount = 0;
      newResource.viewsCount = 0;
      db.collection('resources')
        .add(newResource)
        .then((doc) => {
          resResource = newResource;
          resResource.timelineId = doc.id;
          docId = doc.id;
          db.doc(`mobile timeline/${docId}`).set(resResource);
          return res.json(resResource);
        })
        // .then(() => {
        //   db.doc(`mobile timeline/${docId}`).set(resResource);
        //   return res.json(resResource);
        // })
        .catch((err) => {
          res.status(500).json({ error: 'something went wrong' });
          console.error(err);
        });
    });

    busboy.end(req.rawBody);
  }
};

// Create Event
exports.adminCreateEvent = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({ headers: req.headers });
  const imageUrl = config.levlsLogoUrl;
  const userId = config.levlsUserId;
  const username = 'levls';
  const isPartner = false;
  let docId;

  let imageToBeUploaded = {};
  let imageFileName;
  let generatedToken = uuid();
  let newEvent = {};

  busboy.on(
    'field',
    function (
      fieldname,
      val,
      fieldnameTruncated,
      valTruncated,
      encoding,
      mimetype
    ) {
      // console.log('Field [' + fieldname + ']: value: ' + inspect(val));
      newEvent[fieldname] = val;
    }
  );

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (
      mimetype !== 'image/jpeg' &&
      mimetype !== 'image/jpg' &&
      mimetype !== 'image/png' &&
      mimetype !== 'video/mp4' &&
      mimetype !== 'video/swf'
    ) {
      return res.status(400).json({ error: 'Wrong file type submitted' });
    }
    const imageExtension = filename.split('.')[filename.split('.').length - 1];
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
        res
          .status(500)
          .json({ error: 'Erm... That was strange, please try again later! ' });
        console.error(err);
      });
  });

  busboy.on('finish', () => {
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
    newEvent.post_time_stamp = Date.parse(post_time_stamp);
    newEvent.likeCount = 0;
    newEvent.commentCount = 0;
    newEvent.viewsCount = 0;
    newEvent.isActive = true;
    newEvent.isPartner = isPartner;
    db.collection('events')
      .add(newEvent)
      .then((doc) => {
        const resEvent = newEvent;
        resEvent.timelineId = doc.id;
        docId = doc.id;
      })
      .then(() => {
        db.doc(`mobile timeline/${docId}`).set(resEvent);
        return res.json(resEvent);
      })
      .catch((err) => {
        res.status(500).json({ error: 'something went wrong' });
        console.error(err);
      });
  });

  busboy.end(req.rawBody);
};

// Create news post
exports.adminCreateNewsPost = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  let docId;
  let resArticle;

  if (req.body.customUrl) {
    if (req.body.title.trim() === '') {
      return res.status(400).json({ error: 'Title must not be empty' });
    }
    if (req.body.shortDescription.trim() === '') {
      return res
        .status(400)
        .json({ error: 'Short description must not be empty' });
    }
    if (req.body.content.trim() === '') {
      return res.status(400).json({ error: 'Content must not be empty' });
    }
    if (req.body.customUrl.trim() === '') {
      return res.status(400).json({ error: 'Url must not be empty' });
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
      shortDescription: req.body.shortDescription,
      slug,
      content: req.body.content,
      category: req.body.category,
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: 'levls',
      userId: config.levlsUserId,
      imageUrl: config.levlsLogoUrl,
      likeCount: 0,
      commentCount: 0,
      contentType: 'news',
      viewsCount: 0,
      isPartner: false,
    };

    db.collection('news')
      .add(newArticle)
      .then((doc) => {
        resArticle = newArticle;
        resArticle.timelineId = doc.id;
        docId = doc.id;
        db.doc(`mobile timeline/${docId}`).set(resArticle);
        return res.json(resArticle);
      })
      // .then(() => {
      //   db.doc(`mobile timeline/${docId}`).set(resArticle);
      //   return res.json(resArticle);
      // })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
  } else {
    const busboy = new BusBoy({ headers: req.headers });
    const imageUrl = config.levlsLogoUrl;
    const userId = config.levlsUserId;
    const username = 'levls';
    const isPartner = false;

    let imageToBeUploaded = {};
    let imageFileName;
    let generatedToken = uuid();
    let newArticle = {};

    busboy.on(
      'field',
      function (
        fieldname,
        val,
        fieldnameTruncated,
        valTruncated,
        encoding,
        mimetype
      ) {
        newArticle[fieldname] = val;
      }
    );

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      if (
        mimetype !== 'image/jpeg' &&
        mimetype !== 'image/jpg' &&
        mimetype !== 'image/png' &&
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
          res
            .status(500)
            .json({
              error: 'Erm... That was strange, please try again later! ',
            });
          console.error(err);
        });
    });

    busboy.on('finish', () => {
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
      newArticle.post_time_stamp = Date.parse(post_time_stamp);
      newArticle.likeCount = 0;
      newArticle.commentCount = 0;
      newArticle.viewsCount = 0;
      newArticle.isPartner = isPartner;
      db.collection('news')
        .add(newArticle)
        .then((doc) => {
          resArticle = newArticle;
          resArticle.timelineId = doc.id;
          docId = doc.id;
          db.doc(`mobile timeline/${docId}`).set(resArticle);
          return res.json(resArticle);
        })
        // .then(() => {
        //   db.doc(`mobile timeline/${docId}`).set(resArticle);
        //   return res.json(resArticle);
        // })
        .catch((err) => {
          res.status(500).json({ error: 'something went wrong' });
          console.error(err);
        });
    });

    busboy.end(req.rawBody);
  }
};


// Get Users
exports.getUsers = async (req, res) => {
  const firstCall = db
    .collection('users')
    .where('userType', '==', 'Personal')
    .orderBy('createdAt', 'desc')
    .limit(12);
  let nextCallDoc;

  if (req.params.call !== 'one') {
    await db
      .doc(`/users/${req.params.call}`)
      .get()
      .then((doc) => {
        nextCallDoc = doc.data();
      });
  }

  let snapshot;

  if (req.params.call === 'one') {
    snapshot = firstCall;
  } else {
    snapshot = db
      .collection('users')
      .where('userType', '==', 'Personal')
      .orderBy('createdAt', 'desc')
      .startAfter(nextCallDoc.createdAt || '')
      .limit(12);
  }

  snapshot
    .get()
    .then((data) => {
      let allUsers = [];
      data.forEach((doc) => {
        allUsers.push({
          userId: doc.id,
          fullname: doc.data().fullname,
          username: doc.data().username,
          dateOfbirth: doc.data().dateOfbirth,
          imageUrl: doc.data().imageUrl,
          email: doc.data().email,
          numberOrname: doc.data().numberOrname,
          street: doc.data().street,
          city: doc.data().city,
          postcode: doc.data().postcode,
          CV: doc.data().CV,
          slogan: doc.data().slogan,
          bio: doc.data().bio,
          mobile: doc.data().mobile,
          backgroundImage: doc.data().backgroundImage,
          gender: doc.data().gender,
          Pronouns: doc.data().Pronouns,
          verified: doc.data().verified,
          isActive: doc.data().isActive,
          followersCount: doc.data().followersCount,
          followingCount: doc.data().followingCount,
          userType: doc.data().userType,
          occupation: doc.data().occupation,
          website: doc.data().website,
          linkedIn: doc.data().linkedIn,
          tiktok: doc.data().tiktok,
          instagram: doc.data().instagram,
          twitter: doc.data().twitter,
          createdAt: doc.data().createdAt,
          deviceToken: doc.data().deviceToken,
        });
      });
      allUsers.push({
        lastDocument: data.docs[data.docs.length - 1].data().userId,
      });
      return res.json(allUsers);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'something went wrong' });
      // res.status(500).json({ error: err.code });
    });
};

// Get Organisations
exports.getOrganisations = async (req, res) => {
  const firstCall = db
    .collection('users')
    .where('userType', '==', 'Organisation')
    .orderBy('createdAt', 'desc')
    .limit(12);
  let nextCallDoc;

  if (req.params.call !== 'one') {
    await db
      .doc(`/users/${req.params.call}`)
      .get()
      .then((doc) => {
        nextCallDoc = doc.data();
      });
  }

  let snapshot;

  if (req.params.call === 'one') {
    snapshot = firstCall;
  } else {
    snapshot = db
      .collection('users')
      .where('userType', '==', 'Organisation')
      .orderBy('createdAt', 'desc')
      .startAfter(nextCallDoc.createdAt || '')
      .limit(12);
  }
  snapshot
    .get()
    .then((data) => {
      let orgs = [];
      data.forEach((doc) => {
        orgs.push({
          userId: doc.id,
          fullname: doc.data().fullname,
          username: doc.data().username,
          email: doc.data().email,
          mobile: doc.data().mobile,
          numberOrname: doc.data().numberOrname,
          street: doc.data().street,
          city: doc.data().city,
          postcode: doc.data().postcode,
          imageUrl: doc.data().imageUrl,
          backgroundImage: doc.data().backgroundImage,
          organisationName: doc.data().organisationName,
          organisationType: doc.data().organisationType,
          followersCount: doc.data().followersCount,
          followingCount: doc.data().followingCount,
          userType: doc.data().userType,
          verified: doc.data().verified,
          isActive: doc.data().isActive,
          website: doc.data().website,
          isPartner: doc.data().isPartner,
          companySize: doc.data().companySize,
          founded: doc.data().founded,
          industry: doc.data().industry,
          linkedIn: doc.data().linkedIn,
          tiktok: doc.data().tiktok,
          instagram: doc.data().instagram,
          twitter: doc.data().twitter,
          createdAt: doc.data().createdAt,
          deviceToken: doc.data().deviceToken,
        });
      });
      orgs.push({
        lastDocument: data.docs[data.docs.length - 1].data().userId,
      });
      return res.json(orgs);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'something went wrong' });
      // res.status(500).json({ error: err.code });
    });
};

// Edit user details
exports.adminEditUserDetails = (req, res) => {
  let userDetails = (req.body);
  console.log(userDetails)
  db.doc(`/users/${req.body.userId}`)
    .update(userDetails)
    .then(() => {
      return res.json({ success: "Details edited successfully" });
    })
    .catch((err) => {
      console.error(err);
      // return res.status(500).json({ error: err.code });
      res.status(500).json({ error: 'something went wrong' });
    });
  
};

// Edit Organisation details
exports.adminEditOrganisationDetails = (req, res) => {
  let orgDetails = (req.body);
  console.log(orgDetails)
  db.doc(`/users/${req.body.userId}`)
    .update(orgDetails)
    .then(() => {
      return res.json({ success: "Details edited successfully" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'something went wrong' });
    });
  
};