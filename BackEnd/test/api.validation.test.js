const assert = require('node:assert/strict');
const test = require('node:test');
const parsePositiveId = require('../utils/parsePositiveId');

test('parsePositiveId accepts positive safe integers', () => {
  assert.equal(parsePositiveId('24'), 24);
});

test('parsePositiveId rejects invalid identifiers', () => {
  for (const value of ['abc', '', '0', '-1', '1.5', '9007199254740992']) {
    assert.equal(parsePositiveId(value), null);
  }
});
