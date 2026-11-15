const usersDao = require('../dao/users.dao');
const { verifySessionToken } = require('../utils/sessionToken');

const requireSession = async (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  const tokenData = match ? verifySessionToken(match[1]) : null;

  if (!tokenData) {
    return res.status(401).json({ error: 'A valid session is required.' });
  }

  try {
    const user = await usersDao.getById(tokenData.sub);
    if (!user) {
      return res.status(401).json({ error: 'A valid session is required.' });
    }

    req.authenticatedUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.authenticatedUser || req.authenticatedUser.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access is required.' });
  }

  return next();
};

module.exports = { requireSession, requireAdmin };
