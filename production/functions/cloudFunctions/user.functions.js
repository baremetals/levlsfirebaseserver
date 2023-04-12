const functions = require('firebase-functions');
const sgMail = require('@sendgrid/mail');
const axios = require('axios');
const { db, admin } = require('../utils/admin');
const config = require('../utils/database');
const {
  addToSendgrid,
  addUserToStrapi,
} = require('../lib');
const client = require('@sendgrid/client');
client.setApiKey(config.sendgridApi);

exports.verifyEmail = functions
  .region('europe-west2')
  .auth.user()
  .onCreate(async (user) => {
    const msg = {
      to: `${user.email}`, // recipient
      from: 'LEVLS. <noreply@levls.io>', // Change to verified sender
      template_id: 'd-558f2d5a214649c7bcccc1f2e30df393',
      dynamic_template_data: {
        subject: 'Thanks for signing up',
        username: user.displayName,
        url: `https://levls.io/signup/${user.uid}`,
        buttonText: 'Verify email now',
      },
    };

    await sgMail
      .send(msg)
      .then(() => {
        console.log('Email sent');
        return db.doc(`/notifications/${user.displayName}`).set({
          createdAt: new Date().toISOString(),
          recipient: user.uid,
          message: `Thank you for registering ${user.displayName}.`,
          type: 'Verify email',
          read: false,
        });
      })
      .catch((error) => {
        console.log(`Sending the verify email produced this error: ${error}`);
      });
  });

// add users to sengrid
exports.addUserToSendgrid = functions
  .region('europe-west2')
  .firestore.document('users/{userId}')
  .onCreate(async (snap, _ctx) => {
    const user = snap.data();
    if (user.userType === 'Personal') {
      const data = {
        list_ids: [config.sendgridUserlist],
        contacts: [
          {
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            unique_name: user.username,
            custom_fields: {
              e1_T: user.firstName + ' ' + user.username,
            },
          },
        ],
      };
      try {
        const response = await addToSendgrid(data);
        console.log(response);
      } catch (err) {
        console.log(err);
      }
    } else {
      const nameArray = user.fullname.split(' ');
      const data = {
        list_ids: [config.sendgridOrgList],
        contacts: [
          {
            email: user.email,
            first_name: nameArray[0],
            last_name: nameArray[-1],
            unique_name: user.username,
            custom_fields: {
              e1_T: user.fullname,
              e2_T: user.organisationName,
              e1_3: user.organisationType,
              e7_T: user.industry,
              e8_T: user.website,
              e9_T: user.referral,
            },
          },
        ],
      };
      try {
        const response = await addToSendgrid(data);
        console.log(response);
      } catch (err) {
        console.log(err);
      }
    }
  });


// add users to strapi backend
exports.addToStrapi = functions
  .region('europe-west2')
  .firestore.document('users/{id}')
  .onCreate(async (snap, _ctx) => {
    const user = snap.data();
    if (user.userType === 'Personal') {      
      try {
        await addUserToStrapi(user);
        await axios({
          method: 'GET',
          url: `${config.strapiApi}/candidates?filters[username][$eq]=${user.username}`,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${config.strapiJwtToken}`,
          },
        })
          .then(async (res) => {
            const { data } = res.data;
            return db.doc(`users/${snap.id}`).update({ strapiId: data[0].id });
          })
          .catch((err) => {
            console.log('This is the error: ', err);
          });
      } catch (err) {
        console.log(err);
      }
    }
  });

exports.welcomeEmail = functions
  .region('europe-west2')
  .firestore.document('users/{id}')
  .onUpdate(async (change, _ctx) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const increment = admin.firestore.FieldValue.increment(1);
    const decrement = admin.firestore.FieldValue.increment(-1);
    const activeUsersRef = db.collection('site stats').doc('active-users');
    const inActiveUsersRef = db.collection('site stats').doc('inactive-users');
    const verifiedUsersRef = db.collection('site stats').doc('verified-users');
    const batch = db.batch();
    const msg = {
      to: `${newData.email}`, // recipient
      from: 'LEVLS. <noreply@levls.io>', // Change to verified sender
      template_id: 'd-c6f168fa8a394bc7b11699c29b868b01',
    };
    if (oldData.verified !== newData.verified) {
      await sgMail
        .send(msg)
        .then(() => {
          console.log('Email sent');
          db.doc(`/notifications/${newData.userId}`).set({
            createdAt: new Date().toISOString(),
            recipient: newData.userId,
            message: `Welcome to the community ${newData.username}.`,
            type: 'welcome email',
            read: false,
          });
        })
        .then(() => {
          batch.set(
            verifiedUsersRef,
            { totalCount: increment },
            { merge: true }
          );
          batch.set(activeUsersRef, { totalCount: increment }, { merge: true });
          batch.set(
            inActiveUsersRef,
            { totalCount: decrement },
            { merge: true }
          );
          return batch.commit();
        })
        .catch((error) => {
          console.error(error);
        });
    } else return null;
  });

// Username update
exports.userNameChangeNotification = functions
  .region('europe-west2')
  .firestore.document('users/{id}')
  .onUpdate((change) => {
    const newUserName = change.after.data().username;
    const userId = change.before.data().userId;
    if (change.before.data().username !== change.after.data().username) {
      const batch = db.batch();
      return db
        .collection('uploads')
        .where('username', '==', change.before.data().username)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const upload = db.doc(`/uploads/${doc.id}`);
            batch.update(upload, { username: change.after.data().username });
          });
          return db
            .collection('followers')
            .where('followerUsername', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const follow = db.doc(`followers/${doc.id}`);
            batch.update(follow, {
              followerUsername: change.after.data().username,
            });
          });
          return db
            .collection('likes')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const like = db.doc(`likes/${doc.id}`);
            batch.update(like, { username: change.after.data().username });
          });
          return db
            .collection('projects')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const project = db.doc(`projects/${doc.id}`);
            batch.update(project, { username: change.after.data().username });
          });
          return db
            .collection('apprenticeships')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const apprentice = db.doc(`apprenticeships/${doc.id}`);
            batch.update(apprentice, {
              username: change.after.data().username,
            });
          });
          return db
            .collection('opportunities')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const opportunities = db.doc(`opportunities/${doc.id}`);
            batch.update(opportunities, {
              username: change.after.data().username,
            });
          });
          return db
            .collection('events')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const event = db.doc(`events/${doc.id}`);
            batch.update(event, { username: change.after.data().username });
          });
          return db
            .collection('articles')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const article = db.doc(`articles/${doc.id}`);
            batch.update(article, { username: change.after.data().username });
          });
          return db
            .collection('comments')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const comment = db.doc(`comments/${doc.id}`);
            batch.update(comment, { username: change.after.data().username });
          });
          return db
            .collection('grants')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const grant = db.doc(`grants/${doc.id}`);
            batch.update(grant, { username: change.after.data().username });
          });
          return db
            .collection('internships')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const internship = db.doc(`internships/${doc.id}`);
            batch.update(internship, {
              username: change.after.data().username,
            });
          });
          return db
            .collection('news')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const post = db.doc(`news/${doc.id}`);
            batch.update(post, { username: change.after.data().username });
          });
          return db
            .collection('resources')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const resource = db.doc(`resources/${doc.id}`);
            batch.update(resource, { username: change.after.data().username });
          });
          return db
            .collection('notifications')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const notification = db.doc(`notifications/${doc.id}`);
            batch.update(notification, {
              username: change.after.data().username,
            });
          });
          return db
            .collection('mobile timeline')
            .where('username', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const timeline = db.doc(`mobile timeline/${doc.id}`);
            batch.update(timeline, { username: change.after.data().username });
          });
          return db
            .collection(`/users/${userId}/followings`)
            .where('followedUserUsername', '==', change.before.data().username)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const following = db.doc(`users/${userId}/followings/${doc.id}`);
            batch.update(following, {
              followedUserUsername: change.after.data().username,
            });
          });
          return db.collection('notifications').add({
            createdAt: new Date().toISOString(),
            message: `your username has been change to ${newUserName}
              If this wasn't you please contact us.`,
            type: 'username',
            read: false,
            recipient: change.before.data().userId,
            sender: 'levls',
            avatar: '',
            notificationId: change.before.data().userId,
          });
        })
        .then(() => {
          return batch.commit();
        })
        .catch((err) => console.error(err));
    } else return null;
  });

// New follower
exports.createNotificationForNewfollower = functions
  .region('europe-west2')
  .firestore.document('followers/{id}')
  .onCreate((snapshot) => {
    return db
      .doc(`/users/${snapshot.data().userId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().username !== snapshot.data().followerUsername
        ) {
          return db.doc(`notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            sender: snapshot.data().followerUsername,
            recipient: doc.data().userId,
            type: 'new follower',
            read: false,
            followerUserId: snapshot.data().followerUserId,
            followerUsername: snapshot.data().followerUsername,
            userId: doc.id,
            avatar: snapshot.data().followerImageUrl,
            message: `${snapshot.data().followerUsername} is following you.`,
            notifications: snapshot.id,
          });
        }
      })
      .catch((err) => console.error(err));
  });

//Delete follower notification when user is unfollowed.
exports.deleteNotificationOnUnfollow = functions
  .region('europe-west2')
  .firestore.document('followers/{id}')
  .onDelete((snapshot, _context) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
      });
  });

// User image update
exports.onUserImageChange = functions
  .region('europe-west2')
  .firestore.document('/users/{userId}')
  .onUpdate((change) => {
    const userId = change.before.data().userId;

    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      const batch = db.batch();
      return db
        .collection('uploads')
        .where('imageUrl', '==', change.before.data().imageUrl)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const upload = db.doc(`/uploads/${doc.id}`);
            batch.update(upload, { imageUrl: change.after.data().imageUrl });
          });
          return db
            .collection('followers')
            .where('followerImageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const follow = db.doc(`followers/${doc.id}`);
            batch.update(follow, {
              followerImageUrl: change.after.data().imageUrl,
            });
          });
          return db
            .collection('likes')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const like = db.doc(`likes/${doc.id}`);
            batch.update(like, { imageUrl: change.after.data().imageUrl });
          });
          return db
            .collection('projects')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const project = db.doc(`projects/${doc.id}`);
            batch.update(project, { imageUrl: change.after.data().imageUrl });
          });
          return db
            .collection('apprenticeships')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const apprentice = db.doc(`apprenticeships/${doc.id}`);
            batch.update(apprentice, {
              imageUrl: change.after.data().imageUrl,
            });
          });
          return db
            .collection('opportunities')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const opportunities = db.doc(`opportunities/${doc.id}`);
            batch.update(opportunities, {
              imageUrl: change.after.data().imageUrl,
            });
          });
          return db
            .collection('events')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const event = db.doc(`events/${doc.id}`);
            batch.update(event, { imageUrl: change.after.data().imageUrl });
          });
          return db
            .collection('articles')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const article = db.doc(`articles/${doc.id}`);
            batch.update(article, { imageUrl: change.after.data().imageUrl });
          });
          return db
            .collection('comments')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const comment = db.doc(`comments/${doc.id}`);
            batch.update(comment, { imageUrl: change.after.data().imageUrl });
          });
          return db
            .collection('grants')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const grant = db.doc(`grants/${doc.id}`);
            batch.update(grant, { imageUrl: change.after.data().imageUrl });
          });
          return db
            .collection('internships')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const internship = db.doc(`internships/${doc.id}`);
            batch.update(internship, {
              imageUrl: change.after.data().imageUrl,
            });
          });
          return db
            .collection('news')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const post = db.doc(`news/${doc.id}`);
            batch.update(post, { imageUrl: change.after.data().imageUrl });
          });
          return db
            .collection('resources')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const resource = db.doc(`resources/${doc.id}`);
            batch.update(resource, { imageUrl: change.after.data().imageUrl });
          });
          return db
            .collection('notifications')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const notification = db.doc(`notifications/${doc.id}`);
            batch.update(notification, {
              imageUrl: change.after.data().imageUrl,
            });
          });
          return db
            .collection('mobile timeline')
            .where('imageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const timeline = db.doc(`mobile timeline/${doc.id}`);
            batch.update(timeline, { imageUrl: change.after.data().imageUrl });
          });
          return db
            .collection(`/users/${userId}/followings`)
            .where('followedUserImageUrl', '==', change.before.data().imageUrl)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const following = db.doc(`users/${userId}/followings/${doc.id}`);
            batch.update(following, {
              followedUserImageUrl: change.after.data().imageUrl,
            });
          });
          return db.collection('notifications').add({
            createdAt: new Date().toISOString(),
            message: `your image has been updated
              If this wasn't you please contact us.`,
            type: 'image update',
            read: false,
            recipient: change.before.data().userId,
            sender: 'levls',
            avatar: '',
            notificationId: change.before.data().userId,
          });
        })
        .then(() => {
          return batch.commit();
        })
        .catch((err) => console.error(err));
    } else return null;
  });

// Update other details
exports.onUserDataChange = functions
  .region('europe-west2')
  .firestore.document('/users/{userId}')
  .onUpdate((change) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const userId = change.before.data().userId;
    const cvDoc = db.doc(`users/${userId}/digital-cv/${userId}`);

    cvDoc
      .get()
      .then(async (doc) => {
        if (doc.exists) {
          switch (
            oldData.occupation !== newData.occupation ||
            oldData.firstName !== newData.firstName ||
            oldData.lastName !== newData.lastName ||
            oldData.isCvPrivate !== newData.isCvPrivate
          ) {
            case oldData.occupation !== newData.occupation:
              cvDoc.update({ occupation: newData.occupation });
            // break;
            case oldData.firstName !== newData.firstName:
              cvDoc.update({ firstName: newData.firstName });
            // break;
            case oldData.lastName !== newData.lastName:
              cvDoc.update({ lastName: newData.lastName });
            // break;
            case oldData.lastName !== newData.lastName:
              cvDoc.update({ lastName: newData.lastName });
            // break;
            case oldData.isCvPrivate !== newData.isCvPrivate:
              cvDoc.update({ isCvPrivate: newData.isCvPrivate });
            // break;
            default:
              cvDoc.update({ updatedAt: new Date().toISOString() });
              break;
          }
        } else {
          return db.doc(`users/${userId}/digital-cv/${userId}`).set({
            createdAt: new Date().toISOString(),
            firstName: newData.firstName,
            lastName: newData.lastName,
            occupation: newData.firstName,
            imageUrl: newData.imageUrl,
            isCvPrivate: true,
            bio: newData.bio,
            profileVideo: '',
            contentType: 'personal',
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });

  });

// Delete a user
exports.onDeleteUser = functions
  .region('europe-west2')
  .firestore.document('/users/{userId}')
  .onDelete((snap, _context) => {
    const data = snap.data();
    const decrement = admin.firestore.FieldValue.increment(-1);
    const activeUsersRef = db.collection('site stats').doc('active-users');
    const inActiveUsersRef = db.collection('site stats').doc('inactive-users');
    const verifiedUsersRef = db.collection('site stats').doc('verified-users');
    const totalUsersRef = db.collection('site stats').doc('all-users');
    const usernameRef = db.doc(`usernames/${data.username}`);
    const batch = db.batch();

    usernameRef.delete();
    batch.set(totalUsersRef, { totalCount: decrement }, { merge: true });

    if (data.isActive === false) {
      batch.set(inActiveUsersRef, { totalCount: decrement }, { merge: true });
    } else {
      batch.set(activeUsersRef, { totalCount: decrement }, { merge: true });
    }

    if (data.verified === true) {
      batch.set(verifiedUsersRef, { totalCount: decrement }, { merge: true });
    }
    return batch.commit();
  });
