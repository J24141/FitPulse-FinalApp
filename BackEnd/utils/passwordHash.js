const { promisify } = require('node:util');
const { pbkdf2, randomBytes, timingSafeEqual } = require('node:crypto');

const deriveKey = promisify(pbkdf2);
const ITERATIONS = 310000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';
const SALT_LENGTH = 16;
const dummySalt = randomBytes(SALT_LENGTH);
const dummyHash = Buffer.alloc(KEY_LENGTH);

const hashPassword = async (password) => {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await deriveKey(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  return `pbkdf2$${DIGEST}$${ITERATIONS}$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
};

const parseHash = (storedHash) => {
  if (typeof storedHash !== 'string') {
    return null;
  }

  const [algorithm, digest, iterations, saltValue, keyValue, ...extra] = storedHash.split('$');
  if (
    algorithm !== 'pbkdf2'
    || digest !== DIGEST
    || Number(iterations) !== ITERATIONS
    || !saltValue
    || !keyValue
    || extra.length
  ) {
    return null;
  }

  const salt = Buffer.from(saltValue, 'base64url');
  const key = Buffer.from(keyValue, 'base64url');
  if (salt.length !== SALT_LENGTH || key.length !== KEY_LENGTH) {
    return null;
  }

  return { salt, key };
};

const verifyPassword = async (password, storedHash) => {
  const parsed = parseHash(storedHash);
  const salt = parsed ? parsed.salt : dummySalt;
  const expectedKey = parsed ? parsed.key : dummyHash;
  const candidateKey = await deriveKey(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  const matches = timingSafeEqual(candidateKey, expectedKey);
  return Boolean(parsed && matches);
};

module.exports = { hashPassword, verifyPassword };
