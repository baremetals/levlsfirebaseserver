const express = require('express')
const eventHelper = require('../controllers/event.controller')
const FBAuth = require('../utils/fbAuth');

const router = express.Router()

router.route('/events')
    .get(eventHelper.getAllEvents)
    .post(FBAuth.protect, eventHelper.createEvent)

router.route('/event/:slug').get(eventHelper.getEvent);

router
  .route('/event/:eventId')
  .delete(FBAuth.protect, eventHelper.deleteEvent)
  .post(FBAuth.protect, eventHelper.updateEventDetails);

router.route('/event/:eventId/like')
    .get(FBAuth.protect, eventHelper.likeEvent)

router.route('/event/:eventId/unlike')
    .get(FBAuth.protect, eventHelper.unLikeEvent)

router.route('/event/:eventId/comments')
    .post(FBAuth.protect, eventHelper.commentOnEvent)

router.route('/event-comment/:commentId')
    .delete(FBAuth.protect, eventHelper.deleteEventComment)

module.exports = router;

