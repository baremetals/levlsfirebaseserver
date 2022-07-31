const { admin, db, defaultAuth } = require('./admin');

exports.safegurad = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    console.error('No token found');
    return res.status(403).json({ error: 'Unauthorized' });
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      return db
        .collection('users')
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.userId = data.docs[0].data().userId;
      req.user.imageUrl = data.docs[0].data().imageUrl;
      req.user.username = data.docs[0].data().username;
      req.user.fullname = data.docs[0].data().fullname;
      req.user.occupation = data.docs[0].data().occupation;
      req.user.city = data.docs[0].data().city;
      req.user.country = data.docs[0].data().country;
      req.user.fullname = data.docs[0].data().fullname;
      req.user.organisationName = data.docs[0].data().organisationName;
      req.user.industry = data.docs[0].data().industry;
      req.user.userType = data.docs[0].data().userType;
      req.user.backgroundImage = data.docs[0].data().backgroundImage;
      req.user.isPartner = data.docs[0].data().isPartner;
      return next();
    })
    .catch((err) => {
      if (err.code === 'auth/id-token-expired') {
        console.error('Error while verifying token ', err);
        return res
          .status(401)
          .json({ error: 'Your session has expired. Please signin again.' });
      } else {
        console.error('Error while verifying token ', err);
        return res.status(403).json({ error: 'Error while verifying token ' });
      }
    });
}

exports.restrictToAdmin = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    console.error('No token found');
    return res.status(403).json({ error: 'Unauthorized' });
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      return db
        .collection('users')
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.isAdmin = data.docs[0].data().isAdmin;
      if (req.user.isAdmin === false) {
        return res.status(403).json({
          error: 'Yo do not have the right permission to make this request',
        });
      } else {
        req.user.userId = data.docs[0].data().userId;
        req.user.imageUrl = data.docs[0].data().imageUrl;
        req.user.username = data.docs[0].data().username;
        req.user.fullname = data.docs[0].data().fullname;
        req.user.occupation = data.docs[0].data().occupation;
        req.user.city = data.docs[0].data().city;
        req.user.country = data.docs[0].data().country;
        req.user.fullname = data.docs[0].data().fullname;
        req.user.userType = data.docs[0].data().userType;
        req.user.isAdmin = data.docs[0].data().isAdmin;
        return next();
      }
    })
    .catch((err) => {
      if (err.code === 'auth/id-token-expired') {
        return res
          .status(401)
          .json({ error: 'Your session has expired. Please signin again.' });
      } else {
        //  console.error('Error while verifying token ', err);
        return res.status(403).json({ error: 'Error while verifying token ' });
      }
    });
}

exports.protect = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    console.error('No token found');
    return res.status(403).json({ error: 'Unauthorized' });
  }

  defaultAuth
    .verifySessionCookie(idToken, true /** checkRevoked */)
    .then((decodedClaims) => {
      return db
        .collection('users')
        .where('userId', '==', decodedClaims.sub)
        .limit(1)
        .get();
    })
    .then((data) => {
      // console.log('the document', data.docs[0].data().userId);
      req.user = data.docs[0].data();
      // console.log('the request user', req.user);
      return next();
    })
    .catch((err) => {
      if (err.code === 'auth/id-token-expired') {
        console.error('Your token has expired please sign in again', err);
        return res
          .status(401)
          .json({ error: 'Your session has expired. Please signin again.' });
      } else {
        console.error('Error while verifying token ', err);
        return res.status(403).json({ error: 'Error while verifying token ' });
      }
    });
};

exports.local = (req, res, next) => {
  db.collection('users')
    .where('userId', '==', 'SuS3gryLV1RAOzPRmBQ9WOHy5CVd')
    .limit(1)
    .get()
    .then((data) => {
      req.user = data.docs[0].data();
      return next();
    })
    .catch((err) => {
      if (err.code === 'auth/id-token-expired') {
        console.error('Error while verifying token ', err);
        return res
          .status(401)
          .json({ error: 'Your session has expired. Please signin again.' });
      } else {
        console.error('Error while verifying token ', err);
        return res.status(403).json({ error: 'Error while verifying token ' });
      }
    });
};
