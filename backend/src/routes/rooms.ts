import { Router, Request, Response } from 'express';
import { Room } from '../models/Room';
import { Message } from '../models/Message';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/rooms - List all chat rooms
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const rooms = await Room.find().sort({ isDefault: -1, createdAt: 1 });
    res.json(rooms);
  } catch (err: any) {
    logger.error({ err }, 'Failed to fetch rooms');
    res.status(500).json({ error: 'Failed to retrieve rooms' });
  }
});

/**
 * POST /api/rooms - Create a new chat room
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const roomId = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const existing = await Room.findOne({ roomId });
    if (existing) {
      return res.status(409).json({ error: 'Room with this name/ID already exists' });
    }

    const newRoom = await Room.create({
      roomId,
      name: name.trim(),
      description: (description || '').trim(),
      isDefault: false,
    });

    logger.info({ roomId, name }, 'New room created');
    return res.status(201).json(newRoom);
  } catch (err: any) {
    logger.error({ err }, 'Failed to create room');
    return res.status(500).json({ error: 'Failed to create room' });
  }
});

/**
 * GET /api/rooms/:roomId/messages - Fetch chat history for a specific room
 */
router.get('/:roomId/messages', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);

    // Fetch latest messages and return in chronological order
    const messages = await Message.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(messages.reverse());
  } catch (err: any) {
    logger.error({ err, roomId: req.params.roomId }, 'Failed to fetch room messages');
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/rooms/:roomId/messages/:messageId/reactions - Add or toggle reaction
 */
router.post('/:roomId/messages/:messageId/reactions', async (req: Request, res: Response) => {
  try {
    const { roomId, messageId } = req.params;
    const { emoji, username } = req.body;

    if (!emoji || !username) {
      return res.status(400).json({ error: 'Emoji and username are required' });
    }

    const message = await Message.findOne({ _id: messageId, roomId });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const reactions = message.reactions || [];
    const existingIndex = reactions.findIndex((r) => r.emoji === emoji);

    if (existingIndex > -1) {
      const userIdx = reactions[existingIndex].users.indexOf(username);
      if (userIdx > -1) {
        reactions[existingIndex].users.splice(userIdx, 1);
        if (reactions[existingIndex].users.length === 0) {
          reactions.splice(existingIndex, 1);
        }
      } else {
        reactions[existingIndex].users.push(username);
      }
    } else {
      reactions.push({ emoji, users: [username] });
    }

    message.reactions = reactions;
    message.markModified('reactions');
    await message.save();

    return res.json({ success: true, reactions: message.reactions });
  } catch (err: any) {
    logger.error({ err }, 'Failed to update reaction via REST');
    return res.status(500).json({ error: 'Failed to update reaction' });
  }
});

export default router;
