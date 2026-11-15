const assert = require('node:assert/strict');
const test = require('node:test');

process.env.SESSION_SECRET = Buffer.alloc(32, 9).toString('hex');

const express = require('express');
const classesDao = require('../dao/classes.dao');
const enrollmentsDao = require('../dao/enrollments.dao');
const instructorsDao = require('../dao/instructors.dao');
const usersDao = require('../dao/users.dao');
const classesRoutes = require('../routes/classes.routes');
const adminRoutes = require('../routes/admin.routes');
const { createSessionToken } = require('../utils/sessionToken');

const startServer = async () => {
  const app = express();
  app.use(express.json());
  app.use('/classes', classesRoutes);
  app.use('/admin', adminRoutes);

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })
  };
};

test('admin can create classes, users can enroll without payment, and dashboard is role-protected', async () => {
  const originals = {
    classCreate: classesDao.create,
    classGetById: classesDao.getById,
    enrollmentCreate: enrollmentsDao.create,
    enrollmentGetForUser: enrollmentsDao.getForUser,
    enrollmentSales: enrollmentsDao.getTodaySales,
    instructorGetById: instructorsDao.getById,
    userGetById: usersDao.getById,
    userGetRegularUsers: usersDao.getRegularUsers
  };
  usersDao.getById = async (id) => ({
    id: Number(id),
    name: Number(id) === 1 ? 'Admin' : 'Member',
    email: `${id}@example.invalid`,
    role: Number(id) === 1 ? 'admin' : 'user'
  });
  usersDao.getRegularUsers = async () => [{
    id: 2,
    name: 'Member',
    email: '2@example.invalid',
    createdAt: '2026-11-15T12:00:00.000Z'
  }];
  instructorsDao.getById = async (id) => ({ id, name: 'Instructor' });
  classesDao.create = async (classData) => {
    assert.deepEqual(classData, {
      name: 'Yoga',
      schedule: '2026-11-16 10:00',
      instructorId: 7
    });
    return { id: 41 };
  };
  classesDao.getById = async (id) => ({ id, name: 'Yoga' });
  enrollmentsDao.create = async ({ userId, classId }) => ({
    id: 15,
    userId,
    classId,
    simulatedAmount: 0
  });
  enrollmentsDao.getTodaySales = async () => ({
    count: 1,
    total: 0,
    records: []
  });
  enrollmentsDao.getForUser = async (userId) => [{
    id: 41,
    name: 'Yoga',
    userId
  }];
  const server = await startServer();

  try {
    const adminToken = createSessionToken(1).token;
    const userToken = createSessionToken(2).token;
    const classPayload = {
      name: 'Yoga',
      instructorId: 7,
      schedule: '2026-11-16T10:00'
    };

    const invalidClass = await fetch(`${server.url}/classes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...classPayload, name: 'x'.repeat(46) })
    });
    assert.equal(invalidClass.status, 400);

    const forbiddenCreate = await fetch(`${server.url}/classes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(classPayload)
    });
    assert.equal(forbiddenCreate.status, 403);

    const createdClass = await fetch(`${server.url}/classes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(classPayload)
    });
    assert.equal(createdClass.status, 201);
    assert.deepEqual(await createdClass.json(), { class: { id: 41, name: 'Yoga' } });

    const enrollment = await fetch(`${server.url}/classes/41/enroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.equal(enrollment.status, 201);
    assert.deepEqual((await enrollment.json()).enrollment, {
      id: 15,
      userId: 2,
      classId: 41,
      simulatedAmount: 0
    });

    const forbiddenAdminEnrollment = await fetch(`${server.url}/classes/41/enroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(forbiddenAdminEnrollment.status, 403);

    const forbiddenDashboard = await fetch(`${server.url}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.equal(forbiddenDashboard.status, 403);

    const dashboard = await fetch(`${server.url}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(dashboard.status, 200);
    const result = await dashboard.json();
    assert.deepEqual(result.users, [{
      id: 2,
      name: 'Member',
      email: '2@example.invalid',
      createdAt: '2026-11-15T12:00:00.000Z'
    }]);
    assert.equal(result.sales.count, 1);
    assert.equal(result.sales.total, 0);

    const supervisedUser = await fetch(`${server.url}/admin/users/2`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(supervisedUser.status, 200);
    const supervisedResult = await supervisedUser.json();
    assert.deepEqual(supervisedResult.user, {
      id: 2,
      name: 'Member',
      email: '2@example.invalid',
      role: 'user'
    });
    assert.deepEqual(supervisedResult.enrollments, [{
      id: 41,
      name: 'Yoga',
      userId: 2
    }]);
    assert.equal(Object.hasOwn(supervisedResult.user, 'password'), false);

    const forbiddenUserProfile = await fetch(`${server.url}/admin/users/2`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.equal(forbiddenUserProfile.status, 403);

    const cannotSuperviseAdmin = await fetch(`${server.url}/admin/users/1`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(cannotSuperviseAdmin.status, 404);
  } finally {
    classesDao.create = originals.classCreate;
    classesDao.getById = originals.classGetById;
    enrollmentsDao.create = originals.enrollmentCreate;
    enrollmentsDao.getForUser = originals.enrollmentGetForUser;
    enrollmentsDao.getTodaySales = originals.enrollmentSales;
    instructorsDao.getById = originals.instructorGetById;
    usersDao.getById = originals.userGetById;
    usersDao.getRegularUsers = originals.userGetRegularUsers;
    await server.close();
  }
});
