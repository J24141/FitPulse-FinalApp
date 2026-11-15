const assert = require('node:assert/strict');
const test = require('node:test');

process.env.SESSION_SECRET = Buffer.alloc(32, 9).toString('hex');

const { createSessionToken, verifySessionToken } = require('../utils/sessionToken');

test('session tokens are signed, expire, and reject tampering', () => {
  const now = Date.UTC(2026, 0, 1);
  const session = createSessionToken(42, now);

  assert.equal(verifySessionToken(session.token, now).sub, '42');
  assert.equal(verifySessionToken(session.token, now + 9 * 60 * 60 * 1000), null);
  assert.equal(verifySessionToken(`${session.token}x`, now), null);
});
