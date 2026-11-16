const db = require('../services/mysql.service');

const create = async ({ userId, classId }) => {
  const connection = await db.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [classes] = await connection.query(
      `SELECT
         classRecord.idclass AS id,
         classRecord.price,
         COALESCE(classRecord.maximum_limit, classRecord.\`maximum-limit\`, 20) AS maximumLimit
       FROM \`class\` AS classRecord
       WHERE classRecord.idclass = ?
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
       classRecord.idclass AS id,
       classRecord.name,
       classRecord.schedule,
       classRecord.price,
       COALESCE(classRecord.maximum_limit, classRecord.\`maximum-limit\`, 20) AS maximumLimit,
       instructorRecord.name AS instructorName,
       enrollmentRecord.created_at AS enrolledAt
     FROM class_enrollment AS enrollmentRecord
     JOIN \`class\` AS classRecord ON classRecord.idclass = enrollmentRecord.class_id
     JOIN instructor AS instructorRecord
       ON instructorRecord.id_instructor = classRecord.instructor_id_instructor
     WHERE enrollmentRecord.user_id = ?
     ORDER BY enrollmentRecord.created_at DESC`,
    [userId]
  );
  return rows;
};

const getTodaySales = async () => {
  const dateFilter = `
    enrollmentRecord.created_at >= CURDATE()
    AND enrollmentRecord.created_at < CURDATE() + INTERVAL 1 DAY
  `;
  const [[summary]] = await db.query(
    `SELECT
       COUNT(*) AS count,
       COALESCE(SUM(enrollmentRecord.simulated_amount), 0) AS total
     FROM class_enrollment AS enrollmentRecord
     WHERE ${dateFilter}`
  );
  const [rows] = await db.query(
    `SELECT
       enrollmentRecord.id,
       userRecord.name AS userName,
       classRecord.name AS className,
       enrollmentRecord.simulated_amount AS amount,
       enrollmentRecord.created_at AS createdAt
     FROM class_enrollment AS enrollmentRecord
     JOIN \`user\` AS userRecord ON userRecord.id = enrollmentRecord.user_id
     JOIN \`class\` AS classRecord ON classRecord.idclass = enrollmentRecord.class_id
     WHERE ${dateFilter}
     ORDER BY enrollmentRecord.created_at DESC`
  );

  return {
    count: Number(summary.count),
    total: Number(summary.total),
    records: rows
  };
};

module.exports = { create, getForUser, getTodaySales };
