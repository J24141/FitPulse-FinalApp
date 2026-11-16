const express = require('express');
const enrollmentsDao = require('../dao/enrollments.dao');
const personalRecordsDao = require('../dao/personal-records.dao');
const usersDao = require('../dao/users.dao');
const parsePositiveId = require('../utils/parsePositiveId');
const { requireSession, requireAdmin } = require('../middleware/sessionAuth');

const router = express.Router();

const isMissingPersonalBestTable = (error) => error && error.code === 'ER_NO_SUCH_TABLE';

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
    let personalRecords = [];
    let personalRecordsError;
    try {
      personalRecords = await personalRecordsDao.getForUser(userId);
    } catch (error) {
      if (!isMissingPersonalBestTable(error)) {
        console.error('Could not load personal records for admin user profile:', error);
      }
      personalRecordsError = isMissingPersonalBestTable(error)
        ? 'No se encontró la tabla personal_best en la base de datos fitpulse.'
        : 'No se pudieron cargar las marcas personales.';
    }

    return res.json({
      user,
      enrollments,
      personalRecords,
      ...(personalRecordsError ? { personalRecordsError } : {})
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/users/:id/personal-records', requireSession, requireAdmin, async (req, res, next) => {
  const userId = parsePositiveId(req.params.id);
  if (!userId) {
    return res.status(400).json({ error: 'User id must be a positive integer.' });
  }

  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const unit = typeof body.unit === 'string' ? body.unit.trim() : '';
  const value = Number(body.value);
  const achievedOn = typeof body.achievedOn === 'string' ? body.achievedOn : '';
  const date = new Date(`${achievedOn}T00:00:00.000Z`);

  if (!name || name.length > 100) {
    return res.status(400).json({ error: 'Record name is required and must be 100 characters or fewer.' });
  }
  if (
    !Number.isFinite(value)
    || value <= 0
    || value > 99999999.99
    || Number(value.toFixed(2)) !== value
  ) {
    return res.status(400).json({ error: 'Record value must be positive and have at most two decimal places.' });
  }
  if (!unit || unit.length > 30) {
    return res.status(400).json({ error: 'A unit is required and must be 30 characters or fewer.' });
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(achievedOn)
    || Number.isNaN(date.getTime())
    || date.toISOString().slice(0, 10) !== achievedOn
    || achievedOn > new Date().toISOString().slice(0, 10)
  ) {
    return res.status(400).json({ error: 'A valid date up to today is required.' });
  }

  try {
    const user = await usersDao.getById(userId);
    if (!user || user.role !== 'user') {
      return res.status(404).json({ error: 'User not found.' });
    }

    const record = await personalRecordsDao.create({
      userId,
      name,
      value,
      unit,
      achievedOn
    });
    return res.status(201).json({ record });
  } catch (error) {
    if (isMissingPersonalBestTable(error)) {
      return res.status(503).json({
        error: 'No se encontró la tabla personal_best en la base de datos fitpulse.'
      });
    }
    return next(error);
  }
});

module.exports = router;
