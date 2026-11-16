const express = require('express');
const usersDao = require('../dao/users.dao');
const enrollmentsDao = require('../dao/enrollments.dao');
const personalRecordsDao = require('../dao/personal-records.dao');
const { verifyPassword } = require('../utils/passwordHash');
const { createSessionToken } = require('../utils/sessionToken');
const { requireSession } = require('../middleware/sessionAuth');

const router = express.Router();

router.get('/me/enrollments', requireSession, async (req, res, next) => {
  try {
    const enrollments = await enrollmentsDao.getForUser(req.authenticatedUser.id);
    return res.json({ enrollments });
  } catch (error) {
    return next(error);
  }
});

router.get('/me/personal-records', requireSession, async (req, res, next) => {
  try {
    const records = await personalRecordsDao.getForUser(req.authenticatedUser.id);
    return res.json({ records });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireSession, (req, res) => {
  const { id, name, email, role } = req.authenticatedUser;
  return res.json({ user: { id, name, email, role } });
});

router.post('/', async (req, res, next) => {
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;

  if (!email || typeof password !== 'string' || password.length > 128) {
    return res.status(400).json({ error: 'A valid email and password are required.' });
  }

  try {
    const user = await usersDao.getByEmail(email);
    const passwordMatches = await verifyPassword(password, user && user.password);
    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const session = createSessionToken(user.id);
    return res.status(201).json({
      token: session.token,
      tokenType: 'Bearer',
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
