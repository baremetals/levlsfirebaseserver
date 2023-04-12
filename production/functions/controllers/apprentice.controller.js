const { admin, db } = require('../utils/admin');
const sgMail = require('@sendgrid/mail');
const config = require('../utils/database');
const { v4 } = require('uuid');

// Fetch all apprenticeships
exports.getAllApprenticeships = (req, res) => {
  db.collection('apprenticeships')
    .where('userId', '==', req.params.userId)
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
          username: doc.data().username,
          userId: doc.data().userId,
          imageUrl: doc.data().imageUrl,
          createdAt: doc.data().createdAt,
          contentType: doc.data().contentType,
          deadline: doc.data().deadline,
          organisationName: doc.data().organisationName,
          applicationLink: doc.data().applicationLink,
          applicantCount: doc.data().applicantCount,
          jobType: doc.data().jobType,
          isActive: doc.data().isActive,
          viewsCount: doc.data().viewsCount,
          state: doc.data().state,
          educationQuestions: doc.data().educationQuestions,
          workQuestions: doc.data().workQuestions,
          additionalQuestions: doc.data().additionalQuestions,
          salary: doc.data().salary,
          pageUrl: doc.data().pageUrl,
          howtoApply: doc.data().howtoApply,
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
exports.createAnApprenticeship = (req, res) => {
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
        <p>A new apprenticeship has been created by ${
          req.user.organisationName || req.user.username
        }. Please review and activate </p>

        <a href=https://justappli-b9f5c.web.app/admin/apprenticeships/"> Visit </a>
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

    const newApprentice = {
      title: req.body.title,
      shortDescription: req.body.shortDescription,
      content: req.body.content,
      slug,
      jobType: req.body.jobType,
      location: req.body.location,
      salary: req.body.salary,
      deadline: req.body.deadline || '',
      howtoApply: req.body.howtoApply,
      educationQuestions: req.body.educationQuestions,
      workQuestions: req.body.workQuestions,
      additionalQuestions: req.body.additionalQuestions,
      applicationLink: req.body.applicationLink || '',
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: req.user.username,
      userId: req.user.userId,
      imageUrl: req.user.imageUrl,
      organisationName: req.user.organisationName,
      contentType: 'apprenticeship',
      isActive: false,
      state: req.body.state || 'draft',
      applicantCount: 0,
      pageUrl: `apprenticeship/${req.body.jobType.toLowerCase()}/${slug}`,
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
        await sgMail.send(adminMsg);
        return res.status(201).json(resApprentice);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
  }
};

// Fetch one apprenticeship
exports.getAnApprenticeship = (req, res) => {
  let apprenticeshipData = {};
  db.collection('apprenticeships')
    .where('slug', '==', req.params.slug)
    .get()
    .then((data) => {
      if (data.length === 0) {
        return res.status(404).json({ error: 'Apprenticeship not found' });
      }
      data.forEach((doc) => {
        apprenticeshipData = doc.data();
        apprenticeshipData.apprenticeshipId = doc.id;
      });
      return res.json(apprenticeshipData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.deleteAnApprenticeship = (req, res) => {
  const document = db.doc(`/apprenticeships/${req.params.apprenticeshipId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Apprenticeship not found' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'The Apprenticeship data was deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Update apprenticeship data
exports.updateAnApprenticeship = (req, res) => {
  let apprenticeshipDetails = req.body;
  const apprenticeshipDoc = db.doc(`/apprenticeships/${req.params.apprenticeshipId}`)

  apprenticeshipDoc
    .get()
    .then(async(doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Apprenticeship not found' });
      }
      await apprenticeshipDoc.update(apprenticeshipDetails)
      await db.doc(`/opportunities/${req.params.apprenticeshipId}`).update(apprenticeshipDetails);
      await db
        .doc(`/mobile timeline/${req.params.apprenticeshipId}`)
        .update(apprenticeshipDetails);
    })
    .then(() => {
      return res.json({ message: "Apprenticeship updated successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.submitApprenticeCVApplication = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const apprenticeshipDocument = db.doc(`apprenticeships/${req.params.apprenticeshipId}`);
  let apprenticeshipData;
  
  const apprenticeshipId = req.params.apprenticeshipId
  const userId = req.user.userId
  const username = req.user.username
  const imageUrl = req.user.imageUrl
  const fullname = req.user.fullname

  let organisationName;
  let apprenticeshipHostUserId;
  let apprenticeshipTitle;
  // let apprenticeshipType;

  let newAppilcation = {
    cvLink: req.body.cvLink,
    apprenticeshipId: apprenticeshipId,
    applicantFullname: fullname,
    applicantUsername: username,
    applicantImageUrl: imageUrl,
    applicantUserId: userId,
    applicationType: 'funding',
    createdAt: new Date().toISOString(),
  };

  let newApplicant = {};

  apprenticeshipDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        apprenticeshipData = doc.data()
        apprenticeshipData.apprenticeshipId = doc.id;
        apprenticeshipHostUserId = apprenticeshipData.userId
        apprenticeshipTitle = apprenticeshipData.title
        // apprenticeshipType = apprenticeshipData.apprenticeshipType
        organisationName = apprenticeshipData.organisationName
        
      } else return res.status(404).json({ error: "Grant document not found"})
    })
    .then(() => {
      if (req.body.cvLink) {
        newAppilcation.apprenticeshipHostUserId = apprenticeshipHostUserId
        newAppilcation.apprenticeshipTitle = apprenticeshipTitle
        // newAppilcation.apprenticeshipType = apprenticeshipType
        newAppilcation.organisationName = organisationName

        db.doc(`apprenticeships/${req.params.apprenticeshipId}/submissions/${userId}`)
          .set(newAppilcation)
          .then(() => {            
            apprenticeshipData.applicantCount++;
            return apprenticeshipDocument.update({ applicantCount: apprenticeshipData.applicantCount });
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
        let generatedToken = v4();

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
          newApplicant.apprenticeshipId = apprenticeshipId
          newApplicant.applicantUsername = username
          newApplicant.applicantImageUrl = imageUrl
          newApplicant.applicantUserId = userId
          newApplicant.applicationType = 'funding'
          newApplicant.createdAt = new Date().toISOString()
          newApplicant.apprenticeshipHostUserId = apprenticeshipHostUserId
          newApplicant.apprenticeshipTitle = apprenticeshipTitle
          // newApplicant.apprenticeshipType = apprenticeshipType
          newApplicant.organisationName = organisationName

          db.doc(`apprenticeships/${req.params.apprenticeshipId}/submissions/${userId}`)
          .set(newApplicant)
          .then(() => {            
            apprenticeshipData.applicantCount++;
            return apprenticeshipDocument.update({ applicantCount: apprenticeshipData.applicantCount });
          })
          .then(() => {
            db.doc(`/users/${req.user.userId}`).update({ CV });
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

exports.submitApprenticeApplication = (req, res) => {
  const itemCollection = db.collection(
    `apprenticeships/${req.params.id}/submissions`
  );
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({ headers: req.headers });

  const apprenticeshipDocument = db.doc(`apprenticeships/${req.params.id}`);

  itemCollection
    .doc(req.user.userId)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(500).json({
          error: 'You have already submitted an application',
        });
      } else {
        let apprenticeshipData;
        const apprenticeshipId = req.params.id;
        const userId = req.user.userId;
        const username = req.user.username;
        const imageUrl = req.user.imageUrl;

        let imagesToBeUploaded = [];
        let imageFileName = {};
        let generatedToken = v4();
        let imageToAdd = {};
        let uploadUrls = [];
        let newAppilcation = {};
        let organisationId;
        let apprenticeshipTitle;
        let jobType;

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
            newAppilcation[fieldname] = val;
          }
        );

        busboy.on('file', (fieldname, file, filename, _encoding, mimetype) => {
          if (
            mimetype !== 'image/jpeg' &&
            mimetype !== 'image/jpg' &&
            mimetype !== 'image/png' &&
            mimetype !== 'image/gif' &&
            mimetype !== 'audio/webm' &&
            mimetype !== 'audio/mp3' &&
            mimetype !== 'audio/wav' &&
            mimetype !== 'video/webm' &&
            mimetype !== 'video/mp4' &&
            mimetype !== 'video/mov' &&
            mimetype !== 'video/swf' &&
            mimetype !== 'application/msword' &&
            mimetype !== 'application/pdf' &&
            mimetype !== 'text/csv' &&
            mimetype !== 'video/mpeg' &&
            mimetype !==
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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

          imageToAdd = {
            imageFileName,
            filepath,
            mimetype,
            fieldname,
          };
          file.pipe(fs.createWriteStream(filepath));
          imagesToBeUploaded.push(imageToAdd);
        });

        busboy.on('finish', async () => {
          let promises = [];

          imagesToBeUploaded.forEach((uploads) => {
            const type = uploads.fieldname;
            uploadUrls.push({
              type,
              url: `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/application-uploads%2F${uploads.imageFileName}?alt=media&token=${generatedToken}`,
            });

            promises.push(
              admin
                .storage()
                .bucket(config.storageBucket)
                .upload(uploads.filepath, {
                  destination: `application-uploads/${uploads.imageFileName}`,
                  resumable: false,
                  metadata: {
                    metadata: {
                      contentType: uploads.mimetype,
                      //Generate token to be appended to imageUrl
                      firebaseStorageDownloadTokens: generatedToken,
                    },
                  },
                })
            );
          });

          try {
            await Promise.all(promises);
            apprenticeshipDocument
              .get()
              .then((doc) => {
                if (doc.exists) {
                  apprenticeshipData = doc.data();
                  apprenticeshipData.apprenticeshipId = doc.id;
                  organisationId = apprenticeshipData.userId;
                  apprenticeshipTitle = apprenticeshipData.title;
                  jobType = apprenticeshipData.jobType;
                } else {
                  return res
                    .status(404)
                    .json({ error: 'Apprenticeship details not found' });
                }
              })
              .then(() => {
                const uploadUrl = uploadUrls;
                newAppilcation.uploadUrl = uploadUrl;
                newAppilcation.applicantUserId = userId;
                newAppilcation.applicantUsername = username;
                newAppilcation.applicantImageUrl = imageUrl;
                newAppilcation.applicationType = 'apprenticeship';
                newAppilcation.apprenticeshipId = apprenticeshipId;
                newAppilcation.createdAt = new Date().toISOString();
                newAppilcation.organisationId = organisationId;
                newAppilcation.apprenticeshipTitle = apprenticeshipTitle;
                newAppilcation.jobType = jobType;

                db.doc(`apprenticeships/${req.params.id}/submissions/${userId}`)
                  .set(newAppilcation)
                  .then(async() => {
                    apprenticeshipData.applicantCount++;
                    await db
                      .doc(`users/${userId}/applications/${req.params.id}`)
                      .set(newAppilcation);
                    return apprenticeshipDocument.update({
                      applicantCount: apprenticeshipData.applicantCount,
                    });
                  })
                  .catch((err) => {
                    res.status(500).json({ error: 'something went wrong' });
                    console.error(err);
                  });
              });

            return res.status(200).json({
              success: `Your application has been submitted`,
            });
          } catch (err) {
            console.log(err);
            res.status(500).json(err);
          }
        });

        busboy.end(req.rawBody);
      }
    })
    .catch((err) => {
      console.error(err);
      return res
        .status(500)
        .json({ error: 'Something went wrong please try again later.' });
    });
};

// Fetch all submissions
exports.getAllApprenticeshipSubmissions = (req, res) => {
  db.doc(`apprenticeships/${req.params.id}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().userId !== req.user.userId) {
        return res.status(500).json({ error: 'permission Denied' });
      }
    })
    .then(async () => {
      return db
        .collection(`apprenticeships/${req.params.id}/submissions`)
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
          if (data.empty) {
            return res.status(201).json([]);
          }
          let submissions = [];
          let questions = [];
          data.forEach((doc) => {
            const addQ = JSON.parse(doc.data().additionalQuestions);
            const edQ = JSON.parse(doc.data().additionalQuestions);
            const wrkQ = JSON.parse(doc.data().additionalQuestions);
            addQ.forEach((dc) => {
              questions.push(dc);
            });
            edQ.forEach((dc) => {
              questions.push(dc);
            });
            wrkQ.forEach((dc) => {
              questions.push(dc);
            });
            submissions.push({
              additionalQuestions: JSON.parse(doc.data().additionalQuestions),
              address: doc.data().address,
              applicantImageUrl: doc.data().applicantImageUrl,
              applicantUserId: doc.data().applicantUserId,
              applicantUsername: doc.data().applicantUsername,
              applicationType: doc.data().applicationType,
              apprenticeshipId: doc.data().apprenticeshipId,
              apprenticeshipTitle: doc.data().apprenticeshipTitle,
              cityOrTown: doc.data().cityOrTown,
              createdAt: doc.data().createdAt,
              dateOfBirth: doc.data().dateOfBirth,
              educationQuestions: JSON.parse(doc.data().educationQuestions),
              email: doc.data().email,
              jobType: doc.data().jobType,
              mobile: doc.data().mobile,
              name: doc.data().name,
              organisationId: doc.data().organisationId,
              postCode: doc.data().postCode,
              preferredName: doc.data().preferredName,
              pronouns: doc.data().pronouns,
              referredBy: doc.data().referredBy,
              uploadUrls: doc.data().uploadUrl,
              workQuestions: JSON.parse(doc.data().workQuestions),
              questions,
            });
          });
          return res.json(submissions);
        })
        .catch((err) => {
          console.error(err);
          res
            .status(500)
            .json({
              error:
                'Something went wrong fetching the submissions please try again later.',
            });
        });
    })
    .catch((error) => {
      console.error(error);
      res
        .status(500)
        .json({
          error:
            'Something went wrong fetching the document please try again later.',
        });
    });
};

// Fetch one submissions
exports.getOneApprenticeSubmission = (req, res) => {
  let submissionData;
  db.doc(`apprenticeships/${req.params.apprenticeshipId}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().organisationId !== req.user.userId) {
        return res.status(500).json({ error: 'Permission Denied' });
      }
    })
    .then(async () => {
      return db
        .doc(
          `apprenticeships/${req.params.apprenticeshipId}/submissions/${req.params.userId}`
        )
        .get()
        .then((doc) => {
          if (!doc.exists) {
            return res.status(401).json({ error: 'Submission not found' });
          }
          submissionData = doc.data();
          return res.status(201).json(submissionData);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({
            error:
              'Something went wrong fetching the submissions please try again later.',
          });
        });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        error:
          'Something went wrong fetching the document please try again later.',
      });
    });
};

// add a candidate to the shortlist
exports.addCandidateToShortList = (req, res) => {
  const userSubmissionData = req.body;
  const apprenticeshipDoc = db.doc(
    `/apprenticeships/${req.params.apprenticeshipId}`
  );

  apprenticeshipDoc
    .get()
    .then(async (result) => {
      if (!result.exists) {
        return res.status(400).json({ error: 'Apprenticeship not found' });
      }
      await db
        .doc(
          `/apprenticeships/${req.params.apprenticeshipId}/shortlist/${req.body.applicantUserId}`
        )
        .set({ ...userSubmissionData, createdAt: new Date().toISOString() });
      return res.status(201).json({ success: 'Candidate added to shortlist' });
    })
    .catch((err) => {
      console.error(err);
      res
        .status(500)
        .json({ error: 'Something went wrong please try again later.' });
    });
};

// add a candidate to the shortlist
exports.addCandidateToInterviewList = (req, res) => {
  const userSubmissionData = req.body;
  const apprenticeshipDoc = db.doc(
    `/apprenticeships/${req.params.apprenticeshipId}`
  );

  apprenticeshipDoc
    .get()
    .then(async (result) => {
      if (!result.exists) {
        return res.status(400).json({ error: 'Apprenticeship not found' });
      }
      await db
        .doc(
          `/apprenticeships/${req.params.apprenticeshipId}/interview-list/${req.body.applicantUserId}`
        )
        .set({ ...userSubmissionData, createdAt: new Date().toISOString() });
      return res
        .status(201)
        .json({ success: 'Candidate added to interview list' });
    })
    .catch((err) => {
      console.error(err);
      res
        .status(500)
        .json({ error: 'Something went wrong please try again later.' });
    });
};


exports.getAllShortListedCandidates = (req, res) => {
  db.doc(`apprenticeships/${req.params.id}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().userId !== req.user.userId) {
        return res.status(500).json({ error: 'permission Denied' });
      }
    })
    .then(async () => {
      return db
        .collection(`apprenticeships/${req.params.id}/shortlist`)
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
          if (data.empty) {
            return res
              .status(401)
              .json({ error: 'Apprenticeship shortlist not found' });
          }
          let shortlist = [];
          // let questions = [];
          data.forEach((doc) => {
            shortlist.push(doc.data());
          });
          return res.json(shortlist);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({
            error:
              'Something went wrong fetching the submissions please try again later.',
          });
        });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        error:
          'Something went wrong fetching the document please try again later.',
      });
    });
};

exports.getInterviewList = (req, res) => {
  db.doc(`apprenticeships/${req.params.id}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().userId !== req.user.userId) {
        return res.status(500).json({ error: 'permission Denied' });
      }
    })
    .then(async () => {
      return db
        .collection(`apprenticeships/${req.params.id}/interview-list`)
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
          if (data.empty) {
            return res
              .status(401)
              .json({ error: 'Apprenticeship interview-list not found' });
          }
          let interviewList = [];
          data.forEach((doc) => {
            interviewList.push(
              doc.data()
            );
          });
          return res.json(interviewList);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({
            error:
              'Something went wrong fetching the submissions please try again later.',
          });
        });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        error:
          'Something went wrong fetching the document please try again later.',
      });
    });
};


exports.getAllShortListedCandidates = (req, res) => {
  db.doc(`apprenticeships/${req.params.apprenticeshipId}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().userId !== req.user.userId) {
        return res.status(500).json({ error: 'permission Denied' });
      }
    })
    .then(async () => {
      return db
        .collection(`apprenticeships/${req.params.apprenticeshipId}/shortlist`)
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
          if (data.empty) {
            return res.status(201).json([]);
          }
          let shortlist = [];
          // let questions = [];
          data.forEach((doc) => {
            shortlist.push(doc.data());
          });
          return res.json(shortlist);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({
            error:
              'Something went wrong fetching the submissions please try again later.',
          });
        });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        error:
          'Something went wrong fetching the document please try again later.',
      });
    });
};

exports.getInterviewList = (req, res) => {
  db.doc(`apprenticeships/${req.params.apprenticeshipId}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().userId !== req.user.userId) {
        return res.status(500).json({ error: 'permission Denied' });
      }
    })
    .then(async () => {
      return db
        .collection(
          `apprenticeships/${req.params.apprenticeshipId}/interview-list`
        )
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
          if (data.empty) {
            return res.status(201).json([]);
          }
          let interviewList = [];
          // let questions = [];
          data.forEach((doc) => {
            // const addQ = JSON.parse(doc.data().additionalQuestions);
            // const edQ = JSON.parse(doc.data().additionalQuestions);
            // const wrkQ = JSON.parse(doc.data().additionalQuestions);
            // addQ.forEach((dc) => {
            //   questions.push(dc);
            // });
            // edQ.forEach((dc) => {
            //   questions.push(dc);
            // });
            // wrkQ.forEach((dc) => {
            //   questions.push(dc);
            // });
            interviewList.push(
              doc.data()
              //   {
              //   additionalQuestions: JSON.parse(doc.data().additionalQuestions),
              //   address: doc.data().address,
              //   applicantImageUrl: doc.data().applicantImageUrl,
              //   applicantUserId: doc.data().applicantUserId,
              //   applicantUsername: doc.data().applicantUsername,
              //   applicationType: doc.data().applicationType,
              //   apprenticeshipId: doc.data().apprenticeshipId,
              //   apprenticeshipTitle: doc.data().apprenticeshipTitle,
              //   cityOrTown: doc.data().cityOrTown,
              //   createdAt: doc.data().createdAt,
              //   dateOfBirth: doc.data().dateOfBirth,
              //   educationQuestions: JSON.parse(doc.data().educationQuestions),
              //   email: doc.data().email,
              //   jobType: doc.data().jobType,
              //   mobile: doc.data().mobile,
              //   name: doc.data().name,
              //   organisationId: doc.data().organisationId,
              //   postCode: doc.data().postCode,
              //   preferredName: doc.data().preferredName,
              //   pronouns: doc.data().pronouns,
              //   referredBy: doc.data().referredBy,
              //   uploadUrls: doc.data().uploadUrl,
              //   workQuestions: JSON.parse(doc.data().workQuestions),
              //   questions,
              // }
            );
          });
          return res.json(interviewList);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({
            error:
              'Something went wrong fetching the submissions please try again later.',
          });
        });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        error:
          'Something went wrong fetching the document please try again later.',
      });
    });
};

exports.removeShortListedCandidate = (req, res) => {
  const document = db.doc(
    `/apprenticeships/${req.params.apprenticeshipId}/shortlist/${req.params.userId}`
  );
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Candidate not found not found' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'The Candidate removed' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.removeFromInterviewList = (req, res) => {
  const document = db.doc(
    `/apprenticeships/${req.params.apprenticeshipId}/interview-list/${req.params.userId}`
  );
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Candidate not found not found' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'The Candidate removed' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};