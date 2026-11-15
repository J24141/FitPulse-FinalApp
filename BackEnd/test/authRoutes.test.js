const assert = require('node:assert/strict');
const test = require('node:test');

process.env.SESSION_SECRET = Buffer.alloc(32, 7).toString('hex');

const express = require('express');
const usersDao = require('../dao/users.dao');
const enrollmentsDao = require('../dao/enrollments.dao');
const usersRoutes = require('../routes/users.routes');
const sessionsRoutes = require('../routes/sessions.routes');
const { hashPassword, verifyPassword } = require('../utils/passwordHash');
const { createSessionToken, verifySessionToken } = require('../utils/sessionToken');

const startServer = async (path, routes) => {
  const app = express();
  app.use(express.json());
  app.use(path, routes);

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}${path}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })
  };
};

test('POST /Users hashes passwords, returns public user data, and handles duplicate emails', async () => {
  const originalCreate = usersDao.create;
  let insertedUser;
  const server = await startServer('/Users', usersRoutes);
  usersDao.create = async (user) => {
    insertedUser = user;
    return { id: 12, name: user.name, email: user.email, role: 'user' };
  };

  try {
    const response = await fetch(server.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'TEST@example.invalid',
        password: 'Test-Password-123',
        role: 'admin'
      })
    });
    const result = await response.json();

    assert.equal(response.status, 201);
    assert.deepEqual(result.user, {
      id: 12,
      name: 'Test User',
      email: 'test@example.invalid',
      role: 'user'
    });
    assert.equal('password' in result.user, false);
    assert.equal('role' in insertedUser, false);
    assert.equal(await verifyPassword('Test-Password-123', insertedUser.passwordHash), true);

    usersDao.create = async () => {
      throw Object.assign(new Error('Duplicate email'), { code: 'ER_DUP_ENTRY' });
    };
    const duplicateResponse = await fetch(server.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.invalid',
        password: 'Test-Password-123'
      })
    });

    assert.equal(duplicateResponse.status, 409);
  } finally {
    usersDao.create = originalCreate;
    await server.close();
  }
});

test('POST /Sessions verifies password and returns a signed token without password data', async () => {
  const originalGetByEmail = usersDao.getByEmail;
  const password = 'Test-Password-456';
  const passwordHash = await hashPassword(password);
  usersDao.getByEmail = async (email) => ({
    id: 34,
    name: 'Test User',
    email,
    password: passwordHash,
    role: 'admin'
  });
  const server = await startServer('/Sessions', sessionsRoutes);

  try {
    const response = await fetch(server.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'TEST@example.invalid', password })
    });
    const result = await response.json();

    assert.equal(response.status, 201);
    assert.equal(result.user.email, 'test@example.invalid');
    assert.equal(result.user.role, 'admin');
    assert.equal('password' in result.user, false);
    assert.equal(verifySessionToken(result.token).sub, '34');

    const invalidResponse = await fetch(server.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.invalid', password: 'wrong-password' })
    });

    assert.equal(invalidResponse.status, 401);
  } finally {
    usersDao.getByEmail = originalGetByEmail;
    await server.close();
  }
});

test('GET /Sessions/me returns the current database role and rejects missing tokens', async () => {
  const originalGetById = usersDao.getById;
  let role = 'admin';
  usersDao.getById = async (id) => ({
    id: Number(id),
    name: 'Admin User',
    email: 'admin@example.invalid',
    role
  });
  const server = await startServer('/Sessions', sessionsRoutes);

  try {
    const token = createSessionToken(34).token;
    const response = await fetch(`${server.url}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(result.user, {
      id: 34,
      name: 'Admin User',
      email: 'admin@example.invalid',
      role: 'admin'
    });

    role = 'user';
    const nonAdminResponse = await fetch(`${server.url}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const nonAdminResult = await nonAdminResponse.json();
    assert.equal(nonAdminResponse.status, 200);
    assert.equal(nonAdminResult.user.role, 'user');

    const missingTokenResponse = await fetch(`${server.url}/me`);
    assert.equal(missingTokenResponse.status, 401);
  } finally {
    usersDao.getById = originalGetById;
    await server.close();
  }
});

test('GET /Sessions/me/enrollments returns only the authenticated user classes', async () => {
  const originalGetById = usersDao.getById;
  const originalGetForUser = enrollmentsDao.getForUser;
  usersDao.getById = async (id) => ({
    id: Number(id),
    name: 'Test User',
    email: 'test@example.invalid',
    role: 'user'
  });
  enrollmentsDao.getForUser = async (userId) => [{
    id: 21,
    name: 'Yoga',
    instructorName: 'Instructor',
    userId
  }];
  const server = await startServer('/Sessions', sessionsRoutes);

  try {
    const token = createSessionToken(34).token;
    const response = await fetch(`${server.url}/me/enrollments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(result.enrollments, [{
      id: 21,
      name: 'Yoga',
      instructorName: 'Instructor',
      userId: 34
    }]);
  } finally {
    usersDao.getById = originalGetById;
    enrollmentsDao.getForUser = originalGetForUser;
    await server.close();
  }
});
