const { admin, db } = require('../utils/admin');
const sgMail = require('@sendgrid/mail');

// Fetch all internships
exports.getAllInternships = (req, res) => {
  db.collection('internships')
    .where('userId', '==', req.params.userId)
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
exports.createAnInternship = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  if (req.body.content.trim() === '') {
    return res.status(400).json({ error: 'Content must not be empty' });
  }
  if (req.body.title.trim() === '') {
    return res.status(400).json({ error: 'Title must not be empty' });
  }
  if (req.body.shortDescription.trim() === '') {
    return res.status(400).json({ error: 'Short description  must not be empty' });
  }

  let resInternship;
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
        <p>A new internship has been created by ${
          req.user.organisationName || req.user.username
        }. Please review and activate </p>

        <a href=https://justappli-b9f5c.web.app/admin/internships/"> Visit </a>
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

    const newInternship = {
      title: req.body.title,
      shortDescription: req.body.shortDescription,
      content: req.body.content,
      slug,
      jobType: req.body.jobType,
      location: req.body.location,
      deadline: req.body.deadline || "",
      applicationLink: req.body.applicationLink || "",
      howtoApply: req.body.howtoApply || "",
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: req.user.username,
      userId: req.user.userId,
      imageUrl: req.user.imageUrl,
      organisationName: req.user.organisationName,
      contentType: 'internship',    
      isActive: false,
      applicantCount: 0
      
    };
  
    db.collection('internships')
        .add(newInternship)
        .then((doc) => {
          resInternship = newInternship;
          resInternship.opportunityId = doc.id;
          resInternship.timelineId = doc.id;
          docId = doc.id
        })
        .then(async () => {
          await db.doc(`opportunities/${docId}`).set(resInternship);
          await db.doc(`mobile timeline/${docId}`).set(resInternship);
          await sgMail.send(adminMsg);
          return res.status(201).json(resInternship);
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({ error: 'Something went wrong' });
        });
  }
  
};

// Fetch one internship
exports.getAnInternship = (req, res) => {
  let internshipData = {};

  db.collection('internships')
    .where('slug', '==', req.params.slug)
    .get()
    .then((data) => {
      if (data.length === 0) {
        return res.status(404).json({ error: 'Internship not found' });
      }
      data.forEach((doc) => {
        internshipData = doc.data();
        internshipData.internshipId = doc.id;
      });

      return res.json(internshipData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Review an internship

// exports.ReviewAnInternship = (req, res) => {
//   if (req.body.body.trim() === '')
//     return res.status(400).json({ review: 'Must not be empty' });

//   const newReview = {
//     body: req.body.body,
//     createdAt: new Date().toISOString(),
//     internshipId: req.params.internshipId,
//     username: req.user.username,
//     userImage: req.user.imageUrl,
//     rating: req.body.rating
//   };

//   db.doc(`/internships/${req.params.internshipId}`)
//     .get()
//     .then((doc) => {
//       if (!doc.exists) {
//         return res.status(404).json({ error: 'Internship not found' });
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

// Delete a internship

exports.deleteAnInternship = (req, res) => {
  const document = db.doc(`/internships/${req.params.internshipId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Internship not found' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'The Internship data was deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Update internship data
exports.updateAnInternship = (req, res) => {
  let internshipDetails = req.body;
  const internshipDoc = db.doc(`/internships/${req.params.internshipId}`)

  internshipDoc
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Internship not found' });
      }
      internshipDoc.update(internshipDetails)
      return db.doc(`/opportunities/${req.params.internshipId}`).update(internshipDetails);
    })
    .then(() => {
      return res.json({ message: "Internship updated successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.submitInternCVApplication = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const internshipDocument = db.doc(`internships/${req.params.internshipId}`);
  let internshipData;
  
  const internshipId = req.params.internshipId
  const userId = req.user.userId
  const username = req.user.username
  const imageUrl = req.user.imageUrl

  let organisationName;
  let internshipHostUserId;
  let internshipTitle;
  // let internshipType;

  let newAppilcation = {
    cvLink: req.body.cvLink,
    internshipId: internshipId,
    applicantUsername: username,
    applicantImageUrl: imageUrl,
    applicantUserId: userId,
    applicationType: 'funding',
    createdAt: new Date().toISOString()
  }

  let newApplicant = {};

  internshipDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        internshipData = doc.data()
        internshipData.internshipId = doc.id;
        internshipHostUserId = internshipData.userId
        internshipTitle = internshipData.title
        // internshipType = internshipData.internshipType
        organisationName = internshipData.organisationName
        
      } else return res.status(404).json({ error: "Grant document not found"})
    })
    .then(() => {
      if (req.body.cvLink) {
        newAppilcation.internshipHostUserId = internshipHostUserId
        newAppilcation.internshipTitle = internshipTitle
        // newAppilcation.internshipType = internshipType
        newAppilcation.organisationName = organisationName

        db.doc(`internships/${req.params.internshipId}/submissions/${userId}`)
          .set(newAppilcation)
          .then(() => {            
            internshipData.applicantCount++;
            return internshipDocument.update({ applicantCount: internshipData.applicantCount });
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
          newApplicant.internshipId = internshipId
          newApplicant.applicantUsername = username
          newApplicant.applicantImageUrl = imageUrl
          newApplicant.applicantUserId = userId
          newApplicant.applicationType = 'funding'
          newApplicant.createdAt = new Date().toISOString()
          newApplicant.internshipHostUserId = internshipHostUserId
          newApplicant.internshipTitle = internshipTitle
          // newApplicant.internshipType = internshipType
          newApplicant.organisationName = organisationName

          db.doc(`internships/${req.params.internshipId}/submissions/${userId}`)
          .set(newApplicant)
          .then(() => {            
            internshipData.applicantCount++;
            return internshipDocument.update({ applicantCount: internshipData.applicantCount });
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
