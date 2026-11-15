require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });

const cors = require('cors');
const express = require('express');
const path = require('node:path');
const apiRoutes = require('./routes/api.routes');

const app = express();
const port = Number(process.env.PORT || 5000);
const allowedOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api/v1', apiRoutes);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});
app.use(express.static(path.join(__dirname, 'public')));

app.use((err, _req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`FitPulse API listening on http://localhost:${port}`);
});
