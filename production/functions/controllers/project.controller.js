const { admin, db } = require('../utils/admin');
const config = require('../utils/database');
const { v4 } = require('uuid');


exports.getAllProjects = (req, res) => {
  db.collection('projects')
    .where('userId', '==', req.params.userId)
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let projects = [];
      data.forEach((doc) => {
        projects.push({
          ...doc.data(),
          projectId: doc.id,
        });
      });
      return res.json(projects);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};


exports.createProject = (req, res) => {
  let post_time_stamp = new Date().toISOString();
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  let docId;
  let resProject;

  if (req.body.customUrl) {
    // let addToCV = req.body.addToCV;
    // if (req.body.addToCV === 'true') {
    //   addToCV = true;
    // } else if (req.body.addToCV === 'false') addToCV = false;

    const slug =
      req.body.title
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-') +
      '-' +
      Date.parse(post_time_stamp);
    const newProject = {
      uploadUrl: req.body.customUrl,
      title: req.body.title,
      shortDescription: req.body.shortDescription,
      description: req.body.description,
      slug,
      category: req.body.category,
      createdAt: new Date().toISOString(),
      post_time_stamp: Date.parse(post_time_stamp),
      username: req.user.username,
      userId: req.user.userId,
      imageUrl: req.user.imageUrl,
      likeCount: 0,
      commentCount: 0,
      contentType: 'project',
      start_date: req.body.start_date,
      closing_date: req.body.closing_date,
      isApplication: req.body.isApplication,
      registerLink: req.body.registerLink,
      isActive: false,
      state: 'draft',
      viewsCount: 0,
      pageUrl: `project/${slug}`,
      addToCV: req.body.addToCV,
    };
    db.collection('projects')
      .add(newProject)
      .then((doc) => {
        resProject = newProject;
        resProject.timelineId = doc.id;
        docId = doc.id;
      })
      .then(async () => {
        await db.doc(`mobile timeline/${docId}`).set(resProject);
        if (req.body.addToCV || req.body.addToCV === 'true') {
          await db
            .doc(`users/${req.user.userId}/digital-cv/${docId}`)
            .set({ ...resProject, contentType: 'project' });
        }
        return res.json(resProject);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Something went wrong' });
      });
  } else {
    const busboy = new BusBoy({ headers: req.headers });
    const imageUrl = req.user.imageUrl;
    const userId = req.user.userId;
    const username = req.user.username;

    let imageToBeUploaded = {};
    let imageFileName;
    let generatedToken = v4();
    let newProject = {};

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
        // console.log('Field [' + fieldname + ']: value: ' + inspect(val));
        newProject[fieldname] = val;
      }
    );

    busboy.on('file', (_fieldname, file, filename, _encoding, mimetype) => {
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
          destination: `projects/${imageFileName}`,
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
          res.status(500).json({
            error: 'Erm... That was strange, please try again later! ',
          });
          console.error(err);
        });
    });

    busboy.on('finish', () => {
      const slug =
        newProject.title
          .toLowerCase()
          .replace(/[^\w ]+/g, '')
          .replace(/ +/g, '-') +
        '-' +
        Date.parse(post_time_stamp);
      const uploadUrl = `${config.firebaseUrl}/v0/b/${config.storageBucket}/o/projects%2F${imageFileName}?alt=media&token=${generatedToken}`;
      newProject.uploadUrl = uploadUrl;
      newProject.userId = userId;
      newProject.username = username;
      newProject.slug = slug;
      newProject.contentType = 'project';
      newProject.imageUrl = imageUrl;
      newProject.createdAt = new Date().toISOString();
      newProject.post_time_stamp = Date.parse(post_time_stamp);
      newProject.likeCount = 0;
      newProject.commentCount = 0;
      newProject.viewsCount = 0;
      newProject.isActive = false;
      newProject.pageUrl = `project/${slug}`;
      newProject.state = 'draft';
      // newProject.addToCV = addToCV || false;
      db.collection('projects')
        .add(newProject)
        .then((doc) => {
          resProject = newProject;
          resProject.timelineId = doc.id;
          docId = doc.id;
        })
        .then(async () => {
          await db.doc(`mobile timeline/${docId}`).set(resProject);
          if (resProject.addToCV || resProject.addToCV === 'true') {
            await db
              .doc(`users/${req.user.userId}/digital-cv/${docId}`)
              .set({ ...resProject, contentType: 'project' });
          }
          return res.json(resProject);
        })
        .catch((err) => {
          res.status(500).json({ error: 'something went wrong' });
          console.error(err);
        });
    });

    busboy.end(req.rawBody);
  }
};

// Fetch one project
exports.getProject = (req, res) => {
  let projectData = {};

  db.collection('projects')
    .where('slug', '==', req.params.slug)
    .get()
    .then((data) => {
      if (data.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      data.forEach((doc) => {
        projectData = doc.data();
        projectData.projectId = doc.id;
        doc.ref.update({ viewsCount: doc.data().viewsCount + 1 });
      });

      return res.json(projectData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Update Project details
exports.updateProjectDetails = (req, res) => {
  let projectDetails = req.body;
  const projectDocument = db.doc(`/projects/${req.params.projectId}`);

  projectDocument
    .get()
    .then(async (doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (doc.data().addToCV || doc.data().addToCV === 'true')
        await db
          .doc(`/users/${req.user.userId}/digital-cv/${req.params.projectId}`)
          .get()
          .then(async (dc) => {
            if (dc.exists) {
              await db
                .doc(
                  `/users/${req.user.userId}/digital-cv/${req.params.projectId}`
                )
                .update(projectDetails);
            }
          });
      await projectDocument.update(projectDetails);
      return db
        .doc(`/mobile timeline/${req.params.projectId}`)
        .update(projectDetails);
    })
    .then(() => {
      return res.json({ message: 'Project updated successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Delete an project
exports.deleteProject = (req, res) => {
  const projectDocument = db.doc(`/projects/${req.params.projectId}`);
  projectDocument
    .get()
    .then(async (doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Project not found' });
      } else {
        if (doc.data().addToCV || doc.data().addToCV === 'true')
          await db
            .doc(`/users/${req.user.userId}/digital-cv/${req.params.projectId}`)
            .get()
            .then(async (dc) => {
              if (dc.exists) {
                await db
                  .doc(
                    `/users/${req.user.userId}/digital-cv/${req.params.projectId}`
                  )
                  .delete();
              }
            });
        return projectDocument.delete();
      }
    })
    .then(() => {
      return db.doc(`/mobile timeline/${req.params.projectId}`).delete();
    })
    .then(() => {
      return res.json({ message: 'Project deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.likeProject = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.projectId}`);
  const likeDocument = db
    .collection('likes')
    .where('userId', '==', req.user.userId)
    .where('projectId', '==', req.params.projectId)
    .limit(1);

  const projectDocument = db.doc(`/projects/${req.params.projectId}`);

  let projectData;
  let uploadOwnerId;
  let mobTimelineData;

  projectDocument
    .get()
    .then(async (doc) => {
      if (doc.exists) {
        projectData = doc.data();
        projectData.projectId = doc.id;
        uploadOwnerId = projectData.userId;
        if (doc.data().addToCV || doc.data().addToCV === 'true')
          await db
            .doc(
              `/users/${doc.data().userId}/digital-cv/${req.params.projectId}`
            )
            .get()
            .then(async (dc) => {
              if (dc.exists) {
                await db
                  .doc(
                    `/users/${doc.data().userId}/digital-cv/${
                      req.params.projectId
                    }`
                  )
                  .update({ likeCount: doc.data().likeCount + 1 });
              }
            });
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'Project not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection('likes')
          .add({
            projectId: req.params.projectId,
            username: req.user.username,
            userId: req.user.userId,
            createdAt: new Date().toISOString(),
            uploadOwnerId: uploadOwnerId,
            imageUrl: req.user.imageUrl,
          })
          .then(async () => {
            projectData.likeCount++;
            projectDocument.update({ likeCount: projectData.likeCount });
            return mobTimelineDoc.get();
          })
          .then((doc) => {
            if (!doc.exists) {
              return res
                .status(404)
                .json({ error: 'Mobile content not found' });
            }
            mobTimelineData = doc.data();
            mobTimelineData.likeCount++;
            return mobTimelineDoc.update({
              likeCount: mobTimelineData.likeCount,
            });
          })
          .then(() => {
            return res.json(projectData);
          });
      } else {
        return res.status(400).json({ error: 'Project already liked' });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.unLikeProject = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.projectId}`);
  const likeDocument = db
    .collection('likes')
    .where('userId', '==', req.user.userId)
    .where('projectId', '==', req.params.projectId)
    .limit(1);

  const projectDocument = db.doc(`/projects/${req.params.projectId}`);

  let projectData;
  let mobTimelineData;

  projectDocument
    .get()
    .then(async (doc) => {
      if (doc.exists) {
        projectData = doc.data();
        projectData.projectId = doc.id;
        if (doc.data().addToCV || doc.data().addToCV === 'true')
          await db
            .doc(
              `/users/${doc.data().userId}/digital-cv/${req.params.projectId}`
            )
            .get()
            .then(async (dc) => {
              if (dc.exists) {
                await db
                  .doc(
                    `/users/${doc.data().userId}/digital-cv/${
                      req.params.projectId
                    }`
                  )
                  .update({ likeCount: doc.data().likeCount - 1 });
              }
            });
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'Project not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: 'Project not liked' });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(async() => {
            projectData.likeCount--;
            projectDocument.update({ likeCount: projectData.likeCount });
            return mobTimelineDoc.get();
          })
          .then((doc) => {
            if (!doc.exists) {
              return res
                .status(404)
                .json({ error: 'Mobile content not found' });
            }
            mobTimelineData = doc.data();
            mobTimelineData.likeCount--;
            return mobTimelineDoc.update({
              likeCount: mobTimelineData.likeCount,
            });
          })
          .then(() => {
            res.json(projectData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.commentOnProject = (req, res) => {
  const mobTimelineDoc = db.doc(`mobile timeline/${req.params.projectId}`);
  if (req.body.comment.trim() === '')
    return res.status(400).json({ comment: 'Must not be empty' });

  const newComment = {
    comment: req.body.comment,
    createdAt: new Date().toISOString(),
    projectId: req.params.projectId,
    mobPostId: req.params.projectId,
    username: req.user.username,
    userId: req.user.userId,
    userImage: req.user.imageUrl,
    edited: false,
  };

  db.doc(`/projects/${req.params.projectId}`)
    .get()
    .then(async (doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Project not found' });
      }
      newComment.uploadOwnerId = doc.data().userId;
      if (doc.data().addToCV || doc.data().addToCV === 'true')
        await db
          .doc(`/users/${doc.data().userId}/digital-cv/${req.params.projectId}`)
          .get()
          .then(async (dc) => {
            if (dc.exists) {
              await db
                .doc(
                  `/users/${doc.data().userId}/digital-cv/${
                    req.params.projectId
                  }`
                )
                .update({ commentCount: doc.data().commentCount + 1 });
            }
          });
      await doc.update({ commentCount: doc.data().commentCount + 1 });
      return mobTimelineDoc.get();
    })
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Mobile content not found' });
      }
      return doc.update({ commentCount: doc.data().commentCount + 1 });
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

exports.deleteProjectComment = (req, res) => {
  const decrement = admin.firestore.FieldValue.increment(-1);
  const commentDoc = db.doc(`/comments/${req.params.commentId}`);
  let timeLineDoc;
  let projectDoc;
  let projectId;
  const batch = db.batch();

  commentDoc
    .get()
    .then(async (doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Comment not found' });
      } else {
        projectId = doc.data().projectId;
        projectDoc = db.doc(`/projects/${projectId}`);
        timeLineDoc = db.doc(`/mobile timeline/${projectId}`);
        await projectDoc.get().then(async (d) => {
          if (d.data().addToCV || d.data().addToCV === 'true')
            await db
              .doc(`/users/${d.data().userId}/digital-cv/${projectId}`)
              .get()
              .then(async (dc) => {
                if (dc.exists) {
                  await db
                    .doc(`/users/${d.data().userId}/digital-cv/${projectId}`)
                    .update({ commentCount: doc.data().commentCount - 1 });
                }
              });
        });
        return commentDoc.delete();
      }
    })
    .then(() => {
      batch.set(projectDoc, { commentCount: decrement }, { merge: true });
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
};
