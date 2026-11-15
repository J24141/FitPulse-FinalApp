const express = require('express');
const instructorsDao = require('../dao/instructors.dao');

const router = express.Router();

router.get('/', async (_req, res) => {
  const instructors = await instructorsDao.getAll();
  return res.json(instructors);
});

module.exports = router;
