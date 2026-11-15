const express = require('express');
const usersDao = require('../dao/users.dao');
const { hashPassword } = require('../utils/passwordHash');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/', async (req, res, next) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = body.password;

  if (!name || name.length > 100) {
    return res.status(400).json({ error: 'Name is required and must be 100 characters or fewer.' });
  }
  if (!email || email.length > 150 || !emailPattern.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (
    typeof password !== 'string'
    || password.length < 8
    || password.length > 128
    || password.trim().length < 8
  ) {
    return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await usersDao.create({ name, email, passwordHash });
    return res.status(201).json({ user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return next(error);
  }
});

module.exports = router;
