const assert = require('node:assert/strict');
const test = require('node:test');

process.env.SESSION_SECRET = Buffer.alloc(32, 13).toString('hex');

const express = require('express');
const adminRoutes = require('../routes/admin.routes');
const sessionsRoutes = require('../routes/sessions.routes');
const enrollmentsDao = require('../dao/enrollments.dao');
const personalRecordsDao = require('../dao/personal-records.dao');
const db = require('../services/mysql.service');
const usersDao = require('../dao/users.dao');
const { createSessionToken } = require('../utils/sessionToken');

const startServer = async () => {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRoutes);
  app.use('/Sessions', sessionsRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })
  };
};

test('admins can add personal_best records to user profiles and users can only read their own records', async () => {
  const originals = {
    enrollmentGetForUser: enrollmentsDao.getForUser,
    personalRecordCreate: personalRecordsDao.create,
    personalRecordGetForUser: personalRecordsDao.getForUser,
    userGetById: usersDao.getById
  };
  const today = new Date().toISOString().slice(0, 10);
  const storedRecords = [{
    id: 91,
    name: 'Press de banca',
    value: 80.5,
    unit: 'kg',
    achievedOn: today
  }];
  let created;
  enrollmentsDao.getForUser = async () => [];
  personalRecordsDao.getForUser = async (userId) => {
    assert.equal(Number(userId), 2);
    return storedRecords;
  };
  personalRecordsDao.create = async (record) => {
    created = record;
    return { id: 91, ...record };
  };
  usersDao.getById = async (id) => ({
    id: Number(id),
    name: Number(id) === 1 ? 'Admin' : 'Member',
    email: `${id}@example.invalid`,
    role: Number(id) === 1 ? 'admin' : 'user'
  });
  const server = await startServer();

  try {
    const adminToken = createSessionToken(1).token;
    const userToken = createSessionToken(2).token;
    const headers = {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };

    const profileResponse = await fetch(`${server.url}/admin/users/2`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(profileResponse.status, 200);
    const profile = await profileResponse.json();
    assert.deepEqual(profile.personalRecords, storedRecords);

    personalRecordsDao.getForUser = async () => {
      throw Object.assign(new Error('Table does not exist.'), { code: 'ER_NO_SUCH_TABLE' });
    };
    const profileWithoutMigration = await fetch(`${server.url}/admin/users/2`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(profileWithoutMigration.status, 200);
    const partialProfile = await profileWithoutMigration.json();
    assert.deepEqual(partialProfile.enrollments, []);
    assert.match(partialProfile.personalRecordsError, /personal_best.*fitpulse/i);
    personalRecordsDao.getForUser = async (userId) => {
      assert.equal(Number(userId), 2);
      return storedRecords;
    };

    const recordResponse = await fetch(`${server.url}/admin/users/2/personal-records`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Press de banca',
        value: 80.5,
        unit: 'kg',
        achievedOn: today
      })
    });
    assert.equal(recordResponse.status, 201);
    assert.deepEqual(created, {
      userId: 2,
      name: 'Press de banca',
      value: 80.5,
      unit: 'kg',
      achievedOn: today
    });

    const invalidRecord = await fetch(`${server.url}/admin/users/2/personal-records`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Press de banca',
        value: -1,
        unit: 'kg',
        achievedOn: today
      })
    });
    assert.equal(invalidRecord.status, 400);

    personalRecordsDao.create = async () => {
      throw Object.assign(new Error('Table does not exist.'), { code: 'ER_NO_SUCH_TABLE' });
    };
    const recordWithoutTable = await fetch(`${server.url}/admin/users/2/personal-records`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Press de banca',
        value: 80.5,
        unit: 'kg',
        achievedOn: today
      })
    });
    assert.equal(recordWithoutTable.status, 503);
    assert.match((await recordWithoutTable.json()).error, /personal_best.*fitpulse/i);
    personalRecordsDao.create = async (record) => {
      created = record;
      return { id: 91, ...record };
    };

    const forbiddenWrite = await fetch(`${server.url}/admin/users/2/personal-records`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Press de banca',
        value: 80.5,
        unit: 'kg',
        achievedOn: today
      })
    });
    assert.equal(forbiddenWrite.status, 403);

    const ownRecords = await fetch(`${server.url}/Sessions/me/personal-records`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.equal(ownRecords.status, 200);
    assert.deepEqual((await ownRecords.json()).records, storedRecords);

    const unauthenticatedRead = await fetch(`${server.url}/Sessions/me/personal-records`);
    assert.equal(unauthenticatedRead.status, 401);
  } finally {
    enrollmentsDao.getForUser = originals.enrollmentGetForUser;
    personalRecordsDao.create = originals.personalRecordCreate;
    personalRecordsDao.getForUser = originals.personalRecordGetForUser;
    usersDao.getById = originals.userGetById;
    await server.close();
  }
});

test('personal record DAO reads and writes the existing personal_best columns', async () => {
  const originalQuery = db.query;
  const queries = [];
  db.query = async (sql, values) => {
    queries.push({ sql, values });
    if (sql.includes('SELECT')) {
      return [[{
        id: 21,
        name: 'Sentadilla',
        value: '95.50',
        unit: 'kg',
        achievedOn: '2026-11-15'
      }], []];
    }
    return [{ insertId: 21 }, []];
  };

  try {
    const records = await personalRecordsDao.getForUser(4);
    assert.deepEqual(records, [{
      id: 21,
      name: 'Sentadilla',
      value: 95.5,
      unit: 'kg',
      achievedOn: '2026-11-15'
    }]);
    assert.match(queries[0].sql, /FROM personal_best/);
    assert.match(queries[0].sql, /exercise_name AS name/);
    assert.deepEqual(queries[0].values, [4]);

    const record = await personalRecordsDao.create({
      userId: 4,
      name: 'Sentadilla',
      value: 95.5,
      achievedOn: '2026-11-15'
    });
    assert.match(queries[1].sql, /INSERT INTO personal_best/);
    assert.deepEqual(queries[1].values, ['Sentadilla', 95.5, '2026-11-15', 4]);
    assert.deepEqual(record, {
      id: 21,
      userId: 4,
      name: 'Sentadilla',
      value: 95.5,
      unit: 'kg',
      achievedOn: '2026-11-15'
    });
  } finally {
    db.query = originalQuery;
  }
});
