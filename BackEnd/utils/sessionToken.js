const { createHmac, randomBytes, timingSafeEqual } = require('node:crypto');

const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;
const configuredSecret = process.env.SESSION_SECRET;

if (configuredSecret && Buffer.byteLength(configuredSecret) < 32) {
  throw new Error('SESSION_SECRET must contain at least 32 bytes.');
}

const secret = configuredSecret || randomBytes(32);
if (!configuredSecret) {
  console.warn('SESSION_SECRET is not set; login tokens will be invalidated when the server restarts.');
}

const sign = (payload) => createHmac('sha256', secret).update(payload).digest();

const createSessionToken = (userId, now = Date.now()) => {
  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + TOKEN_LIFETIME_SECONDS;
  const payload = Buffer.from(JSON.stringify({
    sub: String(userId),
    iat: issuedAt,
    exp: expiresAt
  })).toString('base64url');
  const signature = sign(payload).toString('base64url');

  return {
    token: `${payload}.${signature}`,
    expiresAt: new Date(expiresAt * 1000).toISOString()
  };
};

const verifySessionToken = (token, now = Date.now()) => {
  if (typeof token !== 'string') {
    return null;
  }

  const [payload, signature, ...extra] = token.split('.');
  if (!payload || !signature || extra.length) {
    return null;
  }

  const providedSignature = Buffer.from(signature, 'base64url');
  const expectedSignature = sign(payload);
  if (
    providedSignature.length !== expectedSignature.length
    || !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (
      typeof data.sub !== 'string'
      || !Number.isInteger(data.exp)
      || data.exp <= Math.floor(now / 1000)
    ) {
      return null;
    }
    return data;
  } catch (error) {
    return null;
  }
};

module.exports = { createSessionToken, verifySessionToken };
