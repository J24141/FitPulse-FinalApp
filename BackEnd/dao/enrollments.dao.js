const db = require('../services/mysql.service');

const create = async ({ userId, classId }) => {
  const connection = await db.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [classes] = await connection.query(
      `SELECT
         c.idclass AS id,
         c.price,
         COALESCE(c.maximum_limit, c.\`maximum-limit\`, 20) AS maximumLimit
       FROM \`class\` AS c
       WHERE c.idclass = ?
       FOR UPDATE`,
      [classId]
    );
    const classItem = classes[0];
    if (!classItem) {
      throw Object.assign(new Error('Class not found.'), { code: 'CLASS_NOT_FOUND' });
    }

    const [existing] = await connection.query(
      'SELECT id FROM class_enrollment WHERE user_id = ? AND class_id = ? LIMIT 1',
      [userId, classId]
    );
    if (existing.length) {
      throw Object.assign(new Error('You are already enrolled in this class.'), {
        code: 'ALREADY_ENROLLED'
      });
    }

    const [counts] = await connection.query(
      'SELECT COUNT(*) AS enrolled FROM class_enrollment WHERE class_id = ?',
      [classId]
    );
    if (Number(counts[0].enrolled) >= Number(classItem.maximumLimit)) {
      throw Object.assign(new Error('This class has no available spaces.'), {
        code: 'CLASS_FULL'
      });
    }

    const simulatedAmount = Number(classItem.price) || 0;
    const [result] = await connection.query(
      `INSERT INTO class_enrollment (user_id, class_id, simulated_amount)
       VALUES (?, ?, ?)`,
      [userId, classId, simulatedAmount]
    );
    await connection.commit();
    transactionStarted = false;

    return { id: result.insertId, classId, simulatedAmount };
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }
    throw error;
  } finally {
    connection.release();
  }
};

const getForUser = async (userId) => {
  const [rows] = await db.query(
    `SELECT
       c.idclass AS id,
       c.name,
       c.schedule,
       c.price,
       COALESCE(c.maximum_limit, c.\`maximum-limit\`, 20) AS maximumLimit,
       i.name AS instructorName,
       e.created_at AS enrolledAt
     FROM class_enrollment AS e
     JOIN \`class\` AS c ON c.idclass = e.class_id
     JOIN instructor AS i ON i.id_instructor = c.instructor_id_instructor
     WHERE e.user_id = ?
     ORDER BY e.created_at DESC`,
    [userId]
  );
  return rows;
};

const getTodaySales = async () => {
  const dateFilter = `
    e.created_at >= CURDATE()
    AND e.created_at < CURDATE() + INTERVAL 1 DAY
  `;
  const [[summary]] = await db.query(
    `SELECT
       COUNT(*) AS count,
       COALESCE(SUM(e.simulated_amount), 0) AS total
     FROM class_enrollment AS e
     WHERE ${dateFilter}`
  );
  const [rows] = await db.query(
    `SELECT
       e.id,
       u.name AS userName,
       c.name AS className,
       e.simulated_amount AS amount,
       e.created_at AS createdAt
     FROM class_enrollment AS e
     JOIN \`user\` AS u ON u.id = e.user_id
     JOIN \`class\` AS c ON c.idclass = e.class_id
     WHERE ${dateFilter}
     ORDER BY e.created_at DESC`
  );

  return {
    count: Number(summary.count),
    total: Number(summary.total),
    records: rows
  };
};

module.exports = { create, getForUser, getTodaySales };
