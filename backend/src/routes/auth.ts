import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { hashPassword, comparePassword, generateToken, verifyToken, TokenPayload } from '../utils/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, avatar } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({ error: 'Tên người dùng không được để trống' });
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 2 || trimmedUsername.length > 30) {
      return res.status(400).json({ error: 'Tên người dùng phải từ 2 đến 30 ký tự' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({
      username: { $regex: new RegExp(`^${trimmedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Tên người dùng đã được sử dụng. Vui lòng chọn tên khác.' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await User.create({
      username: trimmedUsername,
      password: hashedPassword,
      avatar: (avatar && String(avatar)) || '1',
      isOnline: true,
      lastSeen: new Date(),
    });

    // Generate token
    const token = generateToken({
      userId: newUser._id.toString(),
      username: newUser.username,
      avatar: newUser.avatar,
    });

    logger.info({ userId: newUser._id, username: newUser.username }, 'User registered successfully');

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      token,
      user: {
        _id: newUser._id,
        username: newUser.username,
        avatar: newUser.avatar,
        isOnline: newUser.isOnline,
        lastSeen: newUser.lastSeen,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in user registration');
    return res.status(500).json({ error: 'Lỗi hệ thống khi đăng ký tài khoản' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate existing user with username and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const trimmedUsername = username.trim();

    // Find user by username with password included
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${trimmedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }

    if (!user.password) {
      // Legacy guest user without password - set new password
      user.password = await hashPassword(password);
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();
    } else {
      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
      }

      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();
    }

    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
    });

    logger.info({ userId: user._id, username: user.username }, 'User logged in successfully');

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in user login');
    return res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Chưa xác thực hoặc token không hợp lệ' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken<TokenPayload>(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Phiên làm việc đã hết hạn hoặc không hợp lệ' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin người dùng' });
    }

    return res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in /api/auth/me');
    return res.status(500).json({ error: 'Lỗi khi lấy thông tin người dùng' });
  }
});

/**
 * POST /api/auth/logout
 * Log out user and update status
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken<TokenPayload>(token);
      if (decoded?.userId) {
        await User.findByIdAndUpdate(decoded.userId, { isOnline: false, lastSeen: new Date() });
      }
    }
    return res.json({ success: true, message: 'Đăng xuất thành công' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in user logout');
    return res.status(500).json({ error: 'Lỗi khi đăng xuất' });
  }
});

export default router;
