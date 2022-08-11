const { admin, db } = require('../utils/admin');
const sgMail = require('@sendgrid/mail');
const { uuid } = require('uuidv4');

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
          jobId: doc.id,
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
          jobType: doc.data().jobType,
          isActive: doc.data().isActive,
          viewsCount: doc.data().viewsCount,
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
      deadline: req.body.deadline || '',
      howtoApply: req.body.howtoApply,
      customQuestions: req.body.customQuestions,
      applicationLink: req.body.applicationLink || '',
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: req.user.username,
      userId: req.user.userId,
      imageUrl: req.user.imageUrl,
      organisationName: req.user.organisationName,
      contentType: 'job',
      isActive: false,
      state: 'draft',
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
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Vacancy not found' });
      }
      jobDoc.update(jobDetails);
      return db
        .doc(`/opportunities/${req.params.jobId}`)
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


exports.submitJobCVApplication = (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const apprenticeshipDocument = db.doc(
    `apprenticeships/${req.params.apprenticeshipId}`
  );
  let apprenticeshipData;

  const apprenticeshipId = req.params.apprenticeshipId;
  const userId = req.user.userId;
  const username = req.user.username;
  const imageUrl = req.user.imageUrl;
  const fullname = req.user.fullname;

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
        apprenticeshipData = doc.data();
        apprenticeshipData.apprenticeshipId = doc.id;
        apprenticeshipHostUserId = apprenticeshipData.userId;
        apprenticeshipTitle = apprenticeshipData.title;
        // apprenticeshipType = apprenticeshipData.apprenticeshipType
        organisationName = apprenticeshipData.organisationName;
      } else return res.status(404).json({ error: 'Grant document not found' });
    })
    .then(() => {
      if (req.body.cvLink) {
        newAppilcation.apprenticeshipHostUserId = apprenticeshipHostUserId;
        newAppilcation.apprenticeshipTitle = apprenticeshipTitle;
        // newAppilcation.apprenticeshipType = apprenticeshipType
        newAppilcation.organisationName = organisationName;

        db.doc(
          `apprenticeships/${req.params.apprenticeshipId}/submissions/${userId}`
        )
          .set(newAppilcation)
          .then(() => {
            apprenticeshipData.applicantCount++;
            return apprenticeshipDocument.update({
              applicantCount: apprenticeshipData.applicantCount,
            });
          })
          .then(() => {
            return res
              .status(201)
              .json({ succes: 'Your application was submitted succesfully' });
          })
          .catch((err) => {
            res.status(500).json({ error: 'something went wrong' });
            console.error(err);
          });
      } else {
        const busboy = new BusBoy({ headers: req.headers });
        let imageToBeUploaded = {};
        let imageFileName;
        let generatedToken = uuid();

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
            newApplicant[fieldname] = val;
          }
        );

        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
          if (
            mimetype !== 'application/msword' &&
            mimetype !== 'application/pdf' &&
            mimetype !==
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ) {
            return res
              .status(400)
              .json({
                error:
                  'Wrong file type submitted. Only word and pdf files allowed',
              });
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
              res
                .status(500)
                .json({
                  error: 'Erm... That was strange, please try again later! ',
                });
              console.error(err);
            });
        });

        busboy.on('finish', () => {
          const CV = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/user-cv%2F${imageFileName}?alt=media&token=${generatedToken}`;
          newApplicant.cvLink = CV;
          newApplicant.apprenticeshipId = apprenticeshipId;
          newApplicant.applicantUsername = username;
          newApplicant.applicantImageUrl = imageUrl;
          newApplicant.applicantUserId = userId;
          newApplicant.applicationType = 'funding';
          newApplicant.createdAt = new Date().toISOString();
          newApplicant.apprenticeshipHostUserId = apprenticeshipHostUserId;
          newApplicant.apprenticeshipTitle = apprenticeshipTitle;
          // newApplicant.apprenticeshipType = apprenticeshipType
          newApplicant.organisationName = organisationName;

          db.doc(
            `apprenticeships/${req.params.apprenticeshipId}/submissions/${userId}`
          )
            .set(newApplicant)
            .then(() => {
              apprenticeshipData.applicantCount++;
              return apprenticeshipDocument.update({
                applicantCount: apprenticeshipData.applicantCount,
              });
            })
            .then(() => {
              db.doc(`/users/${userId}`).update({ CV });
              return res
                .status(201)
                .json({ succes: 'Your application was submitted succesfully' });
            })
            .catch((err) => {
              res.status(500).json({ error: 'something went wrong' });
              console.error(err);
            });
        });

        busboy.end(req.rawBody);
      }
    });
};
