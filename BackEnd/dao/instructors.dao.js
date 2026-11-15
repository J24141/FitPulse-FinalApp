const db = require('../services/mysql.service');

const getAll = async () => {
  const [rows] = await db.query(
    'SELECT id_instructor AS id, name FROM instructor ORDER BY name ASC'
  );
  return rows;
};

module.exports = { getAll };
