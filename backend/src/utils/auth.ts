import crypto from 'crypto';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  username: string;
  avatar?: string;
  exp?: number;
  iat?: number;
}

/**
 * Hash password securely using Node.js crypto.scrypt with a random 16-byte salt
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Compare plain text password against stored salt:hash with constant-time equality check
 */
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!storedHash || !storedHash.includes(':')) {
      return resolve(false);
    }
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) {
      return resolve(false);
    }
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      try {
        const keyBuffer = Buffer.from(key, 'hex');
        if (keyBuffer.length !== derivedKey.length) {
          return resolve(false);
        }
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

function base64UrlEncode(str: string | Buffer): string {
  const base64 = Buffer.isBuffer(str) ? str.toString('base64') : Buffer.from(str).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Generate a standard RFC 7519 JWT (HS256)
 */
export function generateToken(
  payload: Omit<TokenPayload, 'exp' | 'iat'>,
  expiresInSeconds: number = 7 * 24 * 3600
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${header}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(dataToSign)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${dataToSign}.${encodedSignature}`;
}

/**
 * Verify and decode an RFC 7519 JWT
 */
export function verifyToken<T = TokenPayload>(token: string): T | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const dataToSign = `${header}.${payload}`;

    const expectedSig = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(dataToSign)
      .digest();
    const expectedEncoded = base64UrlEncode(expectedSig);

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedEncoded);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const decoded = JSON.parse(base64UrlDecode(payload)) as TokenPayload;
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decoded as unknown as T;
  } catch {
    return null;
  }
}
