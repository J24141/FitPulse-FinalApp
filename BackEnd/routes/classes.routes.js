const express = require('express');
const classesDao = require('../dao/classes.dao');
const parsePositiveId = require('../utils/parsePositiveId');

const router = express.Router();

router.get('/', async (_req, res) => {
  const classes = await classesDao.getAll();
  return res.json(classes);
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
