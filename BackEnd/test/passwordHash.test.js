const assert = require('node:assert/strict');
const test = require('node:test');
const { hashPassword, verifyPassword } = require('../utils/passwordHash');

test('password hashes contain a unique salt and verify only the original password', async () => {
  const password = 'FitPulse-Test-Password-8';
  const firstHash = await hashPassword(password);
  const secondHash = await hashPassword(password);

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword(password, firstHash), true);
  assert.equal(await verifyPassword('wrong-password', firstHash), false);
  assert.equal(await verifyPassword(password, 'not-a-password-hash'), false);
});
