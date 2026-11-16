const db = require('../services/mysql.service');

const classQuery = `
  SELECT
    classRecord.idclass AS id,
    classRecord.name,
    classRecord.schedule,
    classRecord.price,
    classRecord.description,
    classRecord.category,
    COALESCE(classRecord.maximum_limit, classRecord.\`maximum-limit\`, 20) AS maximumLimit,
    instructorRecord.id_instructor AS instructorId,
    instructorRecord.name AS instructorName
  FROM \`class\` AS classRecord
  JOIN instructor AS instructorRecord
    ON instructorRecord.id_instructor = classRecord.instructor_id_instructor
`;

const getAll = async () => {
  const [rows] = await db.query(`${classQuery} ORDER BY classRecord.schedule ASC`);
  return rows;
};

const getById = async (id) => {
  const [rows] = await db.query(`${classQuery} WHERE classRecord.idclass = ?`, [id]);
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
       reviewRecord.idreview AS id,
       reviewRecord.rating,
       reviewRecord.comment,
       reviewRecord.tags,
       reviewRecord.created_at AS createdAt,
       userRecord.name AS userName
     FROM review AS reviewRecord
     JOIN \`user\` AS userRecord ON userRecord.id = reviewRecord.user_id
     WHERE reviewRecord.class_id = ?
     ORDER BY reviewRecord.created_at DESC`,
    [classId]
  );
  return rows;
};

const createReview = async ({ userId, classId, rating, comment }) => {
  const [result] = await db.query(
    `INSERT INTO review (user_id, class_id, rating, comment, tags)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, classId, rating, comment, '[]']
  );
  return { id: result.insertId };
};

module.exports = { getAll, getById, create, getReviews, createReview };
