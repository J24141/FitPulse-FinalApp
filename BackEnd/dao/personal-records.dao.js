const db = require('../services/mysql.service');

const getForUser = async (userId) => {
  const [rows] = await db.query(
    `SELECT
       idpersonal_best AS id,
       exercise_name AS name,
       weight AS value,
       'kg' AS unit,
       DATE_FORMAT(\`date\`, '%Y-%m-%d') AS achievedOn
     FROM personal_best
     WHERE user_id = ?
     ORDER BY \`date\` DESC, idpersonal_best DESC`,
    [userId]
  );
  return rows.map((record) => ({ ...record, value: Number(record.value) }));
};

const create = async ({ userId, name, value, achievedOn }) => {
  const [result] = await db.query(
    `INSERT INTO personal_best (exercise_name, weight, \`date\`, user_id)
     VALUES (?, ?, ?, ?)`,
    [name, value, achievedOn, userId]
  );
  return {
    id: result.insertId,
    userId,
    name,
    value,
    unit: 'kg',
    achievedOn
  };
};

module.exports = { getForUser, create };
