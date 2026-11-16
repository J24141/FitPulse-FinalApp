const express = require('express');
const classesDao = require('../dao/classes.dao');
const enrollmentsDao = require('../dao/enrollments.dao');
const instructorsDao = require('../dao/instructors.dao');
const parsePositiveId = require('../utils/parsePositiveId');
const { requireSession, requireAdmin } = require('../middleware/sessionAuth');

const router = express.Router();

router.get('/', async (_req, res) => {
  const classes = await classesDao.getAll();
  return res.json(classes);
});

router.post('/', requireSession, requireAdmin, async (req, res, next) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const instructorId = parsePositiveId(body.instructorId);
  const schedule = typeof body.schedule === 'string' ? body.schedule.trim() : '';

  if (!name || name.length > 45) {
    return res.status(400).json({ error: 'Class name is required and must be 45 characters or fewer.' });
  }
  if (!instructorId) {
    return res.status(400).json({ error: 'A valid instructor is required.' });
  }
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(schedule)
    || Number.isNaN(Date.parse(schedule))
  ) {
    return res.status(400).json({ error: 'A valid class date and time are required.' });
  }

  try {
    const instructor = await instructorsDao.getById(instructorId);
    if (!instructor) {
      return res.status(400).json({ error: 'The selected instructor does not exist.' });
    }

    const created = await classesDao.create({
      name,
      schedule: schedule.replace('T', ' '),
      instructorId
    });
    const classItem = await classesDao.getById(created.id);
    return res.status(201).json({ class: classItem });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/enroll', requireSession, async (req, res, next) => {
  if (req.authenticatedUser.role !== 'user') {
    return res.status(403).json({ error: 'Only user accounts can enroll in classes.' });
  }

  const classId = parsePositiveId(req.params.id);
  if (!classId) {
    return res.status(400).json({ error: 'Class id must be a positive integer.' });
  }

  try {
    const enrollment = await enrollmentsDao.create({
      userId: req.authenticatedUser.id,
      classId
    });
    return res.status(201).json({ enrollment });
  } catch (error) {
    if (error.code === 'CLASS_NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
    if (error.code === 'ALREADY_ENROLLED' || error.code === 'CLASS_FULL' || error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: error.message || 'You are already enrolled in this class.' });
    }
    return next(error);
  }
});

router.get('/:id/reviews', async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Class id must be a positive integer.' });
  }

  const classItem = await classesDao.getById(id);
  if (!classItem) {
    return res.status(404).json({ error: 'Class not found.' });
  }

  const reviews = await classesDao.getReviews(id);
  return res.json(reviews);
});

router.post('/:id/reviews', requireSession, async (req, res, next) => {
  if (req.authenticatedUser.role !== 'user') {
    return res.status(403).json({ error: 'Only user accounts can write reviews.' });
  }

  const classId = parsePositiveId(req.params.id);
  if (!classId) {
    return res.status(400).json({ error: 'Class id must be a positive integer.' });
  }

  const rating = Number(req.body && req.body.rating);
  const comment = typeof (req.body && req.body.comment) === 'string'
    ? req.body.comment.trim()
    : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
  }
  if (!comment || comment.length > 500) {
    return res.status(400).json({ error: 'Comment is required and must be 500 characters or fewer.' });
  }

  try {
    const classItem = await classesDao.getById(classId);
    if (!classItem) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    const created = await classesDao.createReview({
      userId: req.authenticatedUser.id,
      classId,
      rating,
      comment
    });
    return res.status(201).json({
      review: {
        id: created.id,
        rating,
        comment,
        tags: [],
        userName: req.authenticatedUser.name,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Class id must be a positive integer.' });
  }

  const classItem = await classesDao.getById(id);
  if (!classItem) {
    return res.status(404).json({ error: 'Class not found.' });
  }

  return res.json(classItem);
});

module.exports = router;
