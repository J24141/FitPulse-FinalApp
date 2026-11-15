const db = require('../services/mysql.service');

const create = async ({ name, email, passwordHash }) => {
  const [result] = await db.query(
    'INSERT INTO `user` (name, email, password, role) VALUES (?, ?, ?, \'user\')',
    [name, email, passwordHash]
  );
  return { id: result.insertId, name, email, role: 'user' };
};

const getByEmail = async (email) => {
  const [rows] = await db.query(
    'SELECT id, name, email, password, role FROM `user` WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
};

const getById = async (id) => {
  const [rows] = await db.query(
    'SELECT id, name, email, role FROM `user` WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

const getRegularUsers = async () => {
  const [rows] = await db.query(
    `SELECT id, name, email, created_at AS createdAt
     FROM \`user\`
     WHERE role = 'user'
     ORDER BY created_at DESC`
  );
  return rows;
};

module.exports = { create, getByEmail, getById, getRegularUsers };
