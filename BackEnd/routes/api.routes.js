const express = require('express');
const db = require('../services/mysql.service');
const classRoutes = require('./classes.routes');
const instructorRoutes = require('./instructors.routes');
const usersRoutes = require('./users.routes');
const sessionsRoutes = require('./sessions.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    return res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error);
    return res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
});

router.use('/classes', classRoutes);
router.use('/instructors', instructorRoutes);
router.use('/Users', usersRoutes);
router.use('/Sessions', sessionsRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
