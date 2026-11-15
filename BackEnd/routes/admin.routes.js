const express = require('express');
const enrollmentsDao = require('../dao/enrollments.dao');
const usersDao = require('../dao/users.dao');
const parsePositiveId = require('../utils/parsePositiveId');
const { requireSession, requireAdmin } = require('../middleware/sessionAuth');

const router = express.Router();

router.get('/dashboard', requireSession, requireAdmin, async (_req, res, next) => {
  try {
    const [users, sales] = await Promise.all([
      usersDao.getRegularUsers(),
      enrollmentsDao.getTodaySales()
    ]);
    return res.json({ users, sales });
  } catch (error) {
    return next(error);
  }
});

router.get('/users/:id', requireSession, requireAdmin, async (req, res, next) => {
  const userId = parsePositiveId(req.params.id);
  if (!userId) {
    return res.status(400).json({ error: 'User id must be a positive integer.' });
  }

  try {
    const user = await usersDao.getById(userId);
    if (!user || user.role !== 'user') {
      return res.status(404).json({ error: 'User not found.' });
    }

    const enrollments = await enrollmentsDao.getForUser(userId);
    return res.json({ user, enrollments });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
