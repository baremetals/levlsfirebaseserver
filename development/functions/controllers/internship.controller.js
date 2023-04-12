const { admin, db } = require('../utils/admin');
const sgMail = require('@sendgrid/mail');
const { v4 } = require('uuid');
const config = require('../utils/database');

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
          state: doc.data().state,
          viewsCount: doc.data().viewsCount,
          educationQuestions: doc.data().educationQuestions,
          workQuestions: doc.data().workQuestions,
          additionalQuestions: doc.data().additionalQuestions,
          salary: doc.data().salary,
          pageUrl: doc.data().pageUrl,
          howtoApply: doc.data().howtoApply,
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
      salary: req.body.salary,
      deadline: req.body.deadline || '',
      applicationLink: req.body.applicationLink || '',
      howtoApply: req.body.howtoApply,
      educationQuestions: req.body.educationQuestions,
      workQuestions: req.body.workQuestions,
      additionalQuestions: req.body.additionalQuestions,
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: req.user.username,
      userId: req.user.userId,
      imageUrl: req.user.imageUrl,
      organisationName: req.user.organisationName,
      contentType: 'internship',
      isActive: false,
      state: req.body.state || 'draft',
      applicantCount: 0,
      pageUrl: `internship/${req.body.jobType.toLowerCase()}/${slug}`,
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

exports.submitInternApplication = (req, res) => {
  const itemCollection = db.collection(
    `internships/${req.params.id}/submissions`
  );
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({ headers: req.headers });

  const internshipDocument = db.doc(`internships/${req.params.id}`);

  itemCollection
    .doc(req.user.userId)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(500).json({
          error: 'You have already submitted an application',
        });
      } else {
        let internshipData;
        const internshipId = req.params.id;
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
        let internshipTitle;
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
            mimetype !== 'video/swf' &&
            mimetype !== 'video/mov' &&
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
            internshipDocument
              .get()
              .then((dc) => {
                if (dc.exists) {
                  internshipData = dc.data();
                  internshipData.internshipId = dc.id;
                  organisationId = internshipData.userId;
                  internshipTitle = internshipData.title;
                  jobType = internshipData.jobType;
                } else {
                  return res
                    .status(404)
                    .json({ error: 'Internship details not found' });
                }
              })
              .then(() => {
                const uploadUrl = uploadUrls;
                newAppilcation.uploadUrl = uploadUrl;
                newAppilcation.applicantUserId = userId;
                newAppilcation.applicantUsername = username;
                newAppilcation.applicantImageUrl = imageUrl;
                newAppilcation.applicationType = 'internship';
                newAppilcation.internshipId = internshipId;
                newAppilcation.createdAt = new Date().toISOString();
                newAppilcation.organisationId = organisationId;
                newAppilcation.internshipTitle = internshipTitle;
                newAppilcation.jobType = jobType;

                db.doc(`internships/${req.params.id}/submissions/${userId}`)
                  .set(newAppilcation)
                  .then(() => {
                    internshipData.applicantCount++;
                    return internshipDocument.update({
                      applicantCount: internshipData.applicantCount,
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
exports.getAllInternSubmissions = (req, res) => {
  db.doc(`internships/${req.params.id}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().userId !== req.user.userId) {
        return res.status(500).json({ error: 'permission Denied' });
      }
    })
    .then(async () => {
      return db
        .collection(`internships/${req.params.id}/submissions`)
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
              internshipId: doc.data().internshipId,
              internshipTitle: doc.data().internshipTitle,
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

// Fetch one submissions
exports.getOneInternSubmission = (req, res) => {
  let submissionData;
  db.doc(`internships/${req.params.internshipId}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().organisationId !== req.user.userId) {
        return res.status(500).json({ error: 'Permission Denied' });
      }
    })
    .then(async () => {
      return db
        .doc(
          `internships/${req.params.internshipId}/submissions/${req.params.userId}`
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
exports.addInternCandidateToShortList = (req, res) => {
  const userSubmissionData = req.body;
  const internshipDoc = db.doc(
    `/internships/${req.params.internshipId}`
  );

  internshipDoc
    .get()
    .then(async (result) => {
      if (!result.exists) {
        return res.status(400).json({ error: 'Internship not found' });
      }
      await db
        .doc(
          `/internships/${req.params.internshipId}/shortlist/${req.body.applicantUserId}`
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
exports.addInternCandidateToInterviewList = (req, res) => {
  const userSubmissionData = req.body;
  const internshipDoc = db.doc(
    `/internships/${req.params.internshipId}`
  );

  internshipDoc
    .get()
    .then(async (result) => {
      if (!result.exists) {
        return res.status(400).json({ error: 'Internship not found' });
      }
      await db
        .doc(
          `/internships/${req.params.internshipId}/interview-list/${req.body.applicantUserId}`
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

exports.getAllShortListedInternCandidates = (req, res) => {
  db.doc(`internships/${req.params.internshipId}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().userId !== req.user.userId) {
        return res.status(500).json({ error: 'permission Denied' });
      }
    })
    .then(async () => {
      return db
        .collection(`internships/${req.params.internshipId}/shortlist`)
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

exports.getInternInterviewList = (req, res) => {
  db.doc(`internships/${req.params.internshipId}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().userId !== req.user.userId) {
        return res.status(500).json({ error: 'permission Denied' });
      }
    })
    .then(async () => {
      return db
        .collection(
          `internships/${req.params.internshipId}/interview-list`
        )
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
          if (data.empty) {
            return res.status(201).json([]);
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

exports.removeShortListedInternCandidate = (req, res) => {
  const document = db.doc(
    `/internships/${req.params.internshipId}/shortlist/${req.params.userId}`
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

exports.removeInternFromInterviewList = (req, res) => {
  const document = db.doc(
    `/internships/${req.params.internshipId}/interview-list/${req.params.userId}`
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