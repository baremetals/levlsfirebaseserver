const { admin, db } = require('../utils/admin');
const sgMail = require('@sendgrid/mail');
const { v4 } = require('uuid');
const config = require('../utils/database');

// Fetch all jobs
exports.getAllJobs = (req, res) => {
  db.collection('jobs')
    .where('userId', '==', req.params.userId)
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let jobs = [];
      data.forEach((doc) => {
        jobs.push({
          ...doc.data(),
          jobId: doc.id,
          // title: doc.data().title,
          // shortDescription: doc.data().shortDescription,
          // slug: doc.data().slug,
          // content: doc.data().content,
          // location: doc.data().location,
          // username: doc.data().username,
          // userId: doc.data().userId,
          // imageUrl: doc.data().imageUrl,
          // createdAt: doc.data().createdAt,
          // contentType: doc.data().contentType,
          // deadline: doc.data().deadline,
          // organisationName: doc.data().organisationName,
          // applicationLink: doc.data().applicationLink,
          // jobType: doc.data().jobType,
          // isActive: doc.data().isActive,
          // viewsCount: doc.data().viewsCount,
        });
      });

      return res.json(jobs);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong please try again.' });
    });
};


// Create a job
exports.createAJob = (req, res) => {
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

  let resJob;
  let docId;

  if (req.user.userType !== 'Organisation') {
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
        <p>A new job has been created by ${
          req.user.organisationName || req.user.username
        }. Please review and activate </p>

        <a href=https://justappli-b9f5c.web.app/admin/jobs/"> Visit </a>
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

    const newJob = {
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
      contentType: 'job',
      isActive: false,
      state: req.body.state || 'draft',
      applicantCount: 0,
      pageUrl: `job/${req.body.jobType.toLowerCase()}/${slug}`,
    };

    db.collection('jobs')
      .add(newJob)
      .then((doc) => {
        resJob = newJob;
        resJob.opportunityId = doc.id;
        resJob.timelineId = doc.id;
        docId = doc.id;
      })
      .then(async () => {
        await db.doc(`opportunities/${docId}`).set(resJob);
        await db.doc(`mobile timeline/${docId}`).set(resJob);
        await sgMail.send(adminMsg);
        return res.status(201).json(resJob);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
  }
};


// Fetch one job
exports.getAJob = (req, res) => {
  let jobData = {};
  db.collection('jobs')
    .where('slug', '==', req.params.slug)
    .get()
    .then((data) => {
      if (data.length === 0) {
        return res.status(404).json({ error: 'Vacancy not found' });
      }
      data.forEach((doc) => {
        jobData = doc.data();
        jobData.jobId = doc.id;
      });
      return res.json(jobData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};


exports.deleteAJob = (req, res) => {
  const document = db.doc(`/jobs/${req.params.jobId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Vacancy not found' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'The vacancy data was deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


// Update job data
exports.updateAJob = (req, res) => {
  let jobDetails = req.body;
  const jobDoc = db.doc(`/jobs/${req.params.jobId}`);

  jobDoc
    .get()
    .then(async(doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Vacancy not found' });
      }
      await jobDoc.update(jobDetails);
      await db
        .doc(`/opportunities/${req.params.jobId}`)
        .update(jobDetails);
      await db
        .doc(`/mobile timeline/${req.params.jobId}`)
        .update(jobDetails);
    })
    .then(() => {
      return res.json({ message: 'Vacancy updated successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.submitApplication = (req, res) => {
  const itemCollection = db.collection(
    `jobs/${req.params.id}/submissions`
  );
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({ headers: req.headers });

  const jobDocument = db.doc(`jobs/${req.params.id}`);

  itemCollection
    .doc(req.user.userId)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(500).json({
          error: 'You have already submitted an application',
        });
      } else {
        let jobData;
        const jobId = req.params.id;
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
        let jobTitle;
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
            jobDocument
              .get()
              .then((dc) => {
                if (dc.exists) {
                  jobData = dc.data();
                  jobData.jobId = dc.id;
                  organisationId = jobData.userId;
                  jobTitle = jobData.title;
                  jobType = jobData.jobType;
                } else {
                  return res
                    .status(404)
                    .json({ error: 'Job details not found' });
                }
              })
              .then(() => {
                const uploadUrl = uploadUrls;
                newAppilcation.uploadUrl = uploadUrl;
                newAppilcation.applicantUserId = userId;
                newAppilcation.applicantUsername = username;
                newAppilcation.applicantImageUrl = imageUrl;
                newAppilcation.applicationType = 'job';
                newAppilcation.jobId = jobId;
                newAppilcation.createdAt = new Date().toISOString();
                newAppilcation.organisationId = organisationId;
                newAppilcation.jobTitle = jobTitle;
                newAppilcation.jobType = jobType;

                db.doc(`jobs/${req.params.id}/submissions/${userId}`)
                  .set(newAppilcation)
                  .then(() => {
                    jobData.applicantCount++;
                    return jobDocument.update({
                      applicantCount: jobData.applicantCount,
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
exports.getAllApplicantSubmissions = (req, res) => {
  db.doc(`jobs/${req.params.id}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().userId !== req.user.userId) {
        return res.status(500).json({ error: 'permission Denied' });
      }
    })
    .then(async () => {
      return db
        .collection(`jobs/${req.params.id}/submissions`)
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
              jobId: doc.data().jobId,
              jobTitle: doc.data().jobTitle,
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
exports.getApplicantSubmission = (req, res) => {
  let submissionData;
  db.doc(`jobs/${req.params.jobId}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().organisationId !== req.user.userId) {
        return res.status(500).json({ error: 'Permission Denied' });
      }
    })
    .then(async () => {
      return db
        .doc(
          `jobs/${req.params.jobId}/submissions/${req.params.userId}`
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
exports.addApplicantToShortList = (req, res) => {
  const userSubmissionData = req.body;
  const jobDoc = db.doc(
    `/jobs/${req.params.jobId}`
  );

  jobDoc
    .get()
    .then(async (result) => {
      if (!result.exists) {
        return res.status(400).json({ error: 'Job not found' });
      }
      await db
        .doc(
          `/jobs/${req.params.jobId}/shortlist/${req.body.applicantUserId}`
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
exports.addApplicantToInterviewList = (req, res) => {
  const userSubmissionData = req.body;
  const jobDoc = db.doc(
    `/jobs/${req.params.jobId}`
  );

  jobDoc
    .get()
    .then(async (result) => {
      if (!result.exists) {
        return res.status(400).json({ error: 'Job not found' });
      }
      await db
        .doc(
          `/jobs/${req.params.jobId}/interview-list/${req.body.applicantUserId}`
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

exports.getJobShortList = (req, res) => {
  db.doc(`jobs/${req.params.jobId}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().userId !== req.user.userId) {
        return res.status(500).json({ error: 'permission Denied' });
      }
    })
    .then(async () => {
      return db
        .collection(`jobs/${req.params.jobId}/shortlist`)
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

exports.getJobInterviewList = (req, res) => {
  db.doc(`jobs/${req.params.jobId}`)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data().userId !== req.user.userId) {
        return res.status(500).json({ error: 'permission Denied' });
      }
    })
    .then(async () => {
      return db
        .collection(
          `jobs/${req.params.jobId}/interview-list`
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

exports.removeShortListedApplicant = (req, res) => {
  const document = db.doc(
    `/jobs/${req.params.jobId}/shortlist/${req.params.userId}`
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

exports.removeApplicantFromList = (req, res) => {
  const document = db.doc(
    `/jobs/${req.params.jobId}/interview-list/${req.params.userId}`
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