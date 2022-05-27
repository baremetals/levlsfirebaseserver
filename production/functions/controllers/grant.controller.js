const { admin, db } = require('../utils/admin');
const config = require("../utils/database");
const { v4: uuidv4 } = require('uuid');
const sgMail = require('@sendgrid/mail');

// Fetch all grants
exports.getAllGrants = (req, res) => {
  db.collection('grants')
    .where('userId', '==', req.params.userId)
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let grants = [];
      data.forEach((doc) => {
        grants.push({
          grantId: doc.id,
          title: doc.data().title,
          shortDescription: doc.data().shortDescription,
          slug: doc.data().slug,
          content: doc.data().content,
          region: doc.data().region,
          location: doc.data().location,
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
exports.createAGrant = (req, res) => {
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

  let resGrant;
  let docId;

  if (req.user.userType !== "Organisation") {
    return res.status(400).json({ error: 'You are not permitted' });
  } else {

    const adminMsg = {
      to: 'admin@levls.io', // recipient
      from: 'LEVLS. <noreply@levls.io>',
      subject: `New Opportunity - ${req.body.title}`,
      text: `${
        req.user.organisationName || req.body.username
      }, just created an opportunity`,
      html: `
        <h3> Hello Admin </h3>
        <p>A new grant has been created by ${
          req.user.organisationName || req.user.username
        }. Please review and activate </p>

        <a href=https://justappli-b9f5c.web.app/admin/grants/"> Visit </a>
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

    const newGrant = {
      title: req.body.title,
      shortDescription: req.body.shortDescription,
      content: req.body.content,
      slug,
      category: req.body.category || "",
      grantType: req.body.grantType,
      location: req.body.location,
      region: req.body.region,
      closingDate: req.body.closingDate || "",
      applicationLink: req.body.applicationLink || "",
      howtoApply: req.body.howtoApply || "",
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: req.user.username,
      userId: req.user.userId,
      imageUrl: req.user.imageUrl,
      organisationName: req.user.organisationName,
      contentType: 'grants',
      isActive: false,
      applicantCount: 0
    };
  
    db.collection('grants')
        .add(newGrant)
        .then((doc) => {
          resGrant = newGrant;
          resGrant.opportunityId = doc.id;
          resGrant.timelineId = doc.id;
          docId = doc.id
        })
        .then(async () => {
          await db.doc(`opportunities/${docId}`).set(resGrant);
          await db.doc(`mobile timeline/${docId}`).set(resGrant);
          await sgMail.send(adminMsg);
          return res.status(201).json(resGrant);
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({ error: 'Something went wrong' });
        });
  }
  
};

// Fetch one grant
exports.getAGrant = (req, res) => {
  let grantData = {};

  db.collection('grants')
    .where('slug', '==', req.params.slug)
    .get()
    .then((data) => {
      if (data.length === 0) {
        return res.status(404).json({ error: 'Grant not found' });
      }

      data.forEach((doc) => {
        grantData = doc.data();
        grantData.grantId = doc.id;
      });

      return res.json(grantData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Review an grant
// exports.ReviewAGrant = (req, res) => {
//   if (req.body.body.trim() === '')
//     return res.status(400).json({ review: 'Must not be empty' });

//   const newReview = {
//     body: req.body.body,
//     createdAt: new Date().toISOString(),
//     grantId: req.params.grantId,
//     username: req.user.username,
//     userImage: req.user.imageUrl,
//     rating: req.body.rating
//   };

//   db.doc(`/grants/${req.params.grantId}`)
//     .get()
//     .then((doc) => {
//       if (!doc.exists) {
//         return res.status(404).json({ error: 'Grant not found' });
//       }
//       return doc.ref.update({ reviewCount: doc.data().reviewCount + 1 });
//     })
//     .then(() => {
//       return db.collection('reviews').add(newReview);
//     })
//     .then(() => {
//       res.json(newReview);
//     })
//     .catch((err) => {
//       console.log(err);
//       res.status(500).json({ error: 'Something went wrong' });
//     });
// };

// Delete a grant
exports.deleteAGrant = (req, res) => {
  const document = db.doc(`/grants/${req.params.grantId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Grant not found' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'The Grant data was deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Update grant data
exports.updateAGrant = (req, res) => {
  let grantDetails = req.body;
  const grantDoc = db.doc(`/grants/${req.params.grantId}`)

  grantDoc
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Grant not found' });
      }
      grantDoc.update(grantDetails)
      return db.doc(`/opportunities/${req.params.grantId}`).update(grantDetails);
    })
    .then(() => {
      return res.json({ message: "Grant updated successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.submitGrantApplication = (req, res) => {

  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  const grantDocument = db.doc(`grants/${req.params.grantId}`);
  let grantData;
  const grantId = req.params.grantId
  const userId = req.user.userId
  const username = req.user.username
  const imageUrl = req.user.imageUrl

  let imagesToBeUploaded = [];
  let imageFileName = {};
  let generatedToken = uuidv4();
  let imageToAdd = {}
  let uploadUrls = [];
  let newAppilcation = {};
  let grantHostUserId;
  let grantTitle;
  let grantType;


  busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
    newAppilcation[fieldname] = val
  });

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/jpg" && mimetype !== "image/png"
      && mimetype !== "video/mp4" && mimetype !== "video/swf" && mimetype !== "application/msword"
      && mimetype !== "application/pdf" && mimetype !== "text/csv" && mimetype !== "video/mpeg"
      && mimetype !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), path.basename(imageFileName));
    imageToAdd = {
      imageFileName,
      filepath,
      mimetype
    }
    file.pipe(fs.createWriteStream(filepath));
    imagesToBeUploaded.push(imageToAdd)

  });

  busboy.on("finish", async () => {
    let promises = [];

    imagesToBeUploaded.forEach((imageToBeUploaded) => {

      uploadUrls.push(
        `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/application-uploads%2F${imagesToBeUploaded.imageFileName}?alt=media&token=${generatedToken}`
      );

      promises.push(
        admin
          .storage()
          .bucket()
          .upload(imageToBeUploaded.filepath, {
            destination: `application-uploads/${imageFileName}`,
            resumable: false,
            metadata: {
              metadata: {
                contentType: imageToBeUploaded.mimetype,
                //Generate token to be appended to imageUrl
                firebaseStorageDownloadTokens: generatedToken,
              },
            },
          })

      );
    });

    try {

      await Promise.all(promises);
      grantDocument
        .get()
        .then((doc) => {
          if (doc.exists) {
            grantData = doc.data();
            grantData.grantId = doc.id;
            grantHostUserId = grantData.userId
            grantTitle = grantData.title
            grantType = grantData.grantType
          } else {
            return res.status(404).json({ error: 'Grant details not found' });
          }        
        })
        .then(() => {
          const uploadUrl = uploadUrls
          newAppilcation.uploadUrl = uploadUrl;
          newAppilcation.applicantUserId = userId;
          newAppilcation.applicantUsername = username;
          newAppilcation.applicantImageUrl = imageUrl;
          newAppilcation.applicationType = 'funding';
          newAppilcation.grantId = grantId;
          newAppilcation.createdAt = new Date().toISOString();
          newAppilcation.grantHostUserId = grantHostUserId;
          newAppilcation.grantTitle = grantTitle;
          newAppilcation.grantType = grantType;

          db.doc(`grants/${req.params.grantId}/submissions/${userId}`)
          .set(newAppilcation)
          .then(() => {            
            grantData.applicantCount++;
            return grantDocument.update({ applicantCount: grantData.applicantCount });
          })
          .catch((err) => {
            res.status(500).json({ error: 'something went wrong' });
            console.error(err);
          });
        })
      
      return res.status(200).json({
        success: `Uploads URL: ${uploadUrls}`,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json(err);
    }
    
  });

  busboy.end(req.rawBody);
};

exports.submitGrantCVApplication = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const grantDocument = db.doc(`grants/${req.params.grantId}`);
  let grantData;
  
  const grantId = req.params.grantId
  const userId = req.user.userId
  const username = req.user.username
  const imageUrl = req.user.imageUrl

  let organisationName;
  let grantHostUserId;
  let grantTitle;
  let grantType;

  let newAppilcation = {
    cvLink: req.body.cvLink,
    grantId: grantId,
    applicantUsername: username,
    applicantImageUrl: imageUrl,
    applicantUserId: userId,
    applicationType: 'funding',
    createdAt: new Date().toISOString()
  }

  let newApplicant = {};

  grantDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        grantData = doc.data()
        grantData.grantId = doc.id;
        grantHostUserId = grantData.userId
        grantTitle = grantData.title
        grantType = grantData.grantType
        organisationName = grantData.organisationName
        
      } else return res.status(404).json({ error: "Grant document not found"})
    })
    .then(() => {
      if (req.body.cvLink) {
        newAppilcation.grantHostUserId = grantHostUserId
        newAppilcation.grantTitle = grantTitle
        newAppilcation.grantType = grantType
        newAppilcation.organisationName = organisationName

        db.doc(`grants/${req.params.grantId}/submissions/${userId}`)
          .set(newAppilcation)
          .then(() => {            
            grantData.applicantCount++;
            return grantDocument.update({ applicantCount: grantData.applicantCount });
          })
          .then(() => {
            return res.status(201).json({succes: "Your application was submitted succesfully"});
          })
          .catch((err) => {
            res.status(500).json({ error: 'something went wrong' });
            console.error(err);
          });
      } else {

        const busboy = new BusBoy({ headers: req.headers });
        let imageToBeUploaded = {};
        let imageFileName;
        let generatedToken = uuidv4();

        busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
          newApplicant[fieldname] = val
        });
    
        busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
          if (mimetype !== "application/msword" && mimetype !== "application/pdf"
              && mimetype !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            return res.status(400).json({ error: "Wrong file type submitted. Only word and pdf files allowed" });
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
              destination: `user-cv/${imageFileName}`,
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
          const CV = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/user-cv%2F${imageFileName}?alt=media&token=${generatedToken}`;
          newApplicant.cvLink = CV;
          newApplicant.grantId = grantId
          newApplicant.applicantUsername = username
          newApplicant.applicantImageUrl = imageUrl
          newApplicant.applicantUserId = userId
          newApplicant.applicationType = 'funding'
          newApplicant.createdAt = new Date().toISOString()
          newApplicant.grantHostUserId = grantHostUserId
          newApplicant.grantTitle = grantTitle
          newApplicant.grantType = grantType
          newApplicant.organisationName = organisationName

          db.doc(`grants/${req.params.grantId}/submissions/${userId}`)
          .set(newApplicant)
          .then(() => {            
            grantData.applicantCount++;
            return grantDocument.update({ applicantCount: grantData.applicantCount });
          })
          .then(() => {
            db.doc(`/users/${req.user.uid}`).update({ CV });
            return res.status(201).json({succes: "Your application was submitted succesfully"});
          })
          .catch((err) => {
            res.status(500).json({ error: 'something went wrong' });
            console.error(err);
          });
        });
    
        busboy.end(req.rawBody);
      }
    })
}


