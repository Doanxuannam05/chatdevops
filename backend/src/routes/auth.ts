import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const router = Router();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

function signToken(payload: { username: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): { username: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const avatar = typeof req.body?.avatar === 'string' && req.body.avatar.trim() ? req.body.avatar.trim() : '1';

    if (username.length < 2) {
      return res.status(400).json({ error: 'Tên người dùng phải có ít nhất 2 ký tự' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu đăng ký phải có ít nhất 6 ký tự' });
    }

    const existing = await User.findOne({ username }).select('+password');
    if (existing && existing.password) {
      return res.status(409).json({ error: 'Tên tài khoản đã tồn tại, vui lòng chọn tên khác' });
    }

    const passwordHash = hashPassword(password);
    const user = existing
      ? await User.findOneAndUpdate(
          { _id: existing._id },
          { $set: { password: passwordHash, avatar, isOnline: true, lastSeen: new Date() } },
          { new: true }
        )
      : await User.create({
          username,
          password: passwordHash,
          avatar,
          isOnline: true,
          lastSeen: new Date(),
        });

    const token = signToken({ username });
    logger.info({ username, podName: env.POD_NAME }, 'User registered successfully');

    return res.status(201).json({
      token,
      user: {
        username: user!.username,
        avatar: user!.avatar,
        isOnline: true,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error during user registration');
    return res.status(500).json({ error: 'Lỗi máy chủ khi đăng ký' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' });
    }

    const user = await User.findOne({ username }).select('+password');
    if (!user || !user.password || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = signToken({ username: user.username });
    logger.info({ username: user.username, podName: env.POD_NAME }, 'User logged in successfully');

    return res.status(200).json({
      token,
      user: {
        username: user.username,
        avatar: user.avatar,
        isOnline: true,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error during user login');
    return res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const decoded = token ? verifyToken(token) : null;

    if (decoded?.username) {
      await User.findOneAndUpdate(
        { username: decoded.username },
        { $set: { isOnline: false, lastSeen: new Date() } }
      );
      logger.info({ username: decoded.username, podName: env.POD_NAME }, 'User logged out');
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error during logout');
    return res.status(500).json({ error: 'Lỗi máy chủ khi đăng xuất' });
  }
});

export default router;
