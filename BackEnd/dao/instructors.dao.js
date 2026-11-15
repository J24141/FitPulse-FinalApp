const db = require('../services/mysql.service');

const getAll = async () => {
  const [rows] = await db.query(
    'SELECT id_instructor AS id, name FROM instructor ORDER BY name ASC'
  );
  return rows;
};

const getById = async (id) => {
  const [rows] = await db.query(
    'SELECT id_instructor AS id, name FROM instructor WHERE id_instructor = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

module.exports = { getAll, getById };
