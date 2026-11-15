const db = require('../services/mysql.service');

const classQuery = `
  SELECT
    c.idclass AS id,
    c.name,
    c.schedule,
    c.price,
    c.description,
    c.category,
    COALESCE(c.maximum_limit, c.\`maximum-limit\`, 20) AS maximumLimit,
    i.id_instructor AS instructorId,
    i.name AS instructorName
  FROM \`class\` AS c
  JOIN instructor AS i ON i.id_instructor = c.instructor_id_instructor
`;

const getAll = async () => {
  const [rows] = await db.query(`${classQuery} ORDER BY c.schedule ASC`);
  return rows;
};

const getById = async (id) => {
  const [rows] = await db.query(`${classQuery} WHERE c.idclass = ?`, [id]);
  return rows[0] || null;
};

const create = async ({ name, schedule, instructorId }) => {
  const [result] = await db.query(
    `INSERT INTO \`class\`
       (name, schedule, price, description, category, maximum_limit, \`maximum-limit\`, instructor_id_instructor)
     VALUES (?, ?, 0, '', ?, 20, 20, ?)`,
    [name, schedule, name, instructorId]
  );
  return { id: result.insertId };
};

const getReviews = async (classId) => {
  const [rows] = await db.query(
    `SELECT
       r.idreview AS id,
       r.rating,
       r.comment,
       r.tags,
       r.created_at AS createdAt,
       u.name AS userName
     FROM review AS r
     JOIN \`user\` AS u ON u.id = r.user_id
     WHERE r.class_id = ?
     ORDER BY r.created_at DESC`,
    [classId]
  );
  return rows;
};

module.exports = { getAll, getById, create, getReviews };
