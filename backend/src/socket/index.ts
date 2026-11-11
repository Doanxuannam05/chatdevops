import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, RedisClientType } from 'redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { Message } from '../models/Message';
import { User } from '../models/User';
import {
  wsActiveConnections,
  wsMessagesCounter,
  wsErrorsCounter,
} from '../utils/metrics';

let ioInstance: Server | null = null;
let primaryRedisClient: RedisClientType | null = null;

export function getRedisClient(): RedisClientType | null {
  return primaryRedisClient;
}

export function getSocketIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return ioInstance;
}

/**
 * Initializes Socket.io with Redis Pub/Sub adapter for seamless multi-pod synchronization.
 */
export async function initializeSocket(httpServer: HttpServer): Promise<Server> {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Construct Redis URL
  const authPart = env.REDIS_PASSWORD ? `:${encodeURIComponent(env.REDIS_PASSWORD)}@` : '';
  const redisUrl = `redis://${authPart}${env.REDIS_HOST}:${env.REDIS_PORT}`;

  try {
    const redisOptions = {
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (env.NODE_ENV === 'test' || retries > 3) {
            return false;
          }
          return Math.min(retries * 500, 3000);
        },
        connectTimeout: 1500,
      },
    };

    const pubClient = createClient(redisOptions) as RedisClientType;
    const subClient = pubClient.duplicate() as RedisClientType;

    pubClient.on('error', (err) => {
      logger.error({ err: err.message }, 'Redis Pub Client Error');
      wsErrorsCounter.inc({ pod_name: env.POD_NAME, error_type: 'redis_pub_error' });
    });

    subClient.on('error', (err) => {
      logger.error({ err: err.message }, 'Redis Sub Client Error');
      wsErrorsCounter.inc({ pod_name: env.POD_NAME, error_type: 'redis_sub_error' });
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);

    io.adapter(createAdapter(pubClient, subClient));
    primaryRedisClient = pubClient;

    logger.info(
      { redisHost: env.REDIS_HOST, redisPort: env.REDIS_PORT, podName: env.POD_NAME },
      'Connected to Redis Pub/Sub Adapter successfully'
    );
  } catch (err: any) {
    logger.warn(
      { err: err.message },
      'Could not connect to Redis Pub/Sub. Falling back to local in-memory adapter (single-pod mode)'
    );
  }

  // Socket event lifecycle
  io.on('connection', (socket: Socket) => {
    // Track active connection metric per pod
    wsActiveConnections.inc({ pod_name: env.POD_NAME });

    logger.info(
      { socketId: socket.id, podName: env.POD_NAME },
      'Client connected via WebSocket'
    );

    // Join default room immediately upon connection
    socket.join('general');
    socket.data.currentRoom = 'general';

    // Send initial handshake confirmation with pod identification
    socket.emit('connection_established', {
      socketId: socket.id,
      connectedPod: env.POD_NAME,
      timestamp: new Date().toISOString(),
    });

    // 1. User Authentication / Profile Sync
    socket.on('user_login', async (data: { username: string; avatar?: string }) => {
      try {
        const { username, avatar } = data;
        if (!username || typeof username !== 'string') return;

        const user = await User.findOneAndUpdate(
          { username: username.trim() },
          {
            $set: {
              avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
              isOnline: true,
              lastSeen: new Date(),
            },
          },
          { upsert: true, new: true }
        );

        socket.data.user = user;
        socket.emit('user_login_success', user);
      } catch (err: any) {
        logger.error({ err: err.message }, 'Error in user_login event');
      }
    });

    // 2. Joining a Chat Room
    socket.on('join_room', async (data: { roomId: string; username?: string }) => {
      try {
        const { roomId, username } = data;
        if (!roomId) return;

        // Leave previous rooms except the socket's private room
        socket.rooms.forEach((r) => {
          if (r !== socket.id) {
            socket.leave(r);
          }
        });

        socket.join(roomId);
        socket.data.currentRoom = roomId;

        logger.info(
          { socketId: socket.id, roomId, username, podName: env.POD_NAME },
          'User joined chat room'
        );

        // Broadcast to other users in room across all pods
        socket.to(roomId).emit('user_joined', {
          username: username || 'A guest',
          roomId,
          servedByPod: env.POD_NAME,
          timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        logger.error({ err: err.message }, 'Error in join_room event');
      }
    });

    // 3. Sending a Chat Message
    socket.on('send_message', async (data: { roomId: string; sender: string; avatar?: string; text: string }, callback?: (response: any) => void) => {
      try {
        const { roomId, sender, avatar, text } = data;

        if (!roomId || !sender || !text || text.trim().length === 0) {
          if (callback) callback({ success: false, error: 'Missing required message fields' });
          return;
        }

        // Persist message into MongoDB
        const newMessage = await Message.create({
          roomId,
          sender: sender.trim(),
          avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(sender)}`,
          text: text.trim(),
          senderPod: env.POD_NAME, // Records this specific pod as handler
        });

        // Update Prometheus Metric
        wsMessagesCounter.inc({ room: roomId, sender_pod: env.POD_NAME });

        logger.info(
          { messageId: newMessage._id, roomId, sender, podName: env.POD_NAME },
          'Message broadcasted via Redis adapter'
        );

        // Ensure socket has joined this room so it receives the broadcast
        if (!socket.rooms.has(roomId)) {
          socket.join(roomId);
          socket.data.currentRoom = roomId;
        }

        const messagePayload = {
          _id: newMessage._id,
          roomId: newMessage.roomId,
          sender: newMessage.sender,
          avatar: newMessage.avatar,
          text: newMessage.text,
          senderPod: newMessage.senderPod,
          reactions: newMessage.reactions || [],
          createdAt: newMessage.createdAt,
        };

        // Broadcast to ALL pods subscribed to this room via Redis Pub/Sub
        io.to(roomId).emit('new_message', messagePayload);

        // Immediate acknowledgment back to sender
        if (callback) {
          callback({ success: true, message: messagePayload });
        }
      } catch (err: any) {
        logger.error({ err: err.message }, 'Error handling send_message event');
        wsErrorsCounter.inc({ pod_name: env.POD_NAME, error_type: 'send_message_error' });
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 4. Reacting to a Message (Likes and Emoji Reactions)
    socket.on('react_message', async (data: { messageId: string; roomId: string; emoji: string; username?: string }, callback?: (response: any) => void) => {
      try {
        const { messageId, roomId, emoji } = data;
        const username = socket.data.user?.username || data.username;

        if (!messageId || !roomId || !emoji || !username) {
          if (callback) callback({ success: false, error: 'Missing parameters for reaction' });
          return;
        }

        // Ensure socket has joined this room
        if (!socket.rooms.has(roomId)) {
          socket.join(roomId);
          socket.data.currentRoom = roomId;
        }

        const message = await Message.findOne({ _id: messageId, roomId });
        if (!message) {
          logger.warn({ messageId, roomId }, 'Message not found for reaction');
          if (callback) callback({ success: false, error: 'Message not found' });
          return;
        }

        const reactions = message.reactions || [];
        const existingReactionIndex = reactions.findIndex((r) => r.emoji === emoji);

        if (existingReactionIndex > -1) {
          const userIdx = reactions[existingReactionIndex].users.indexOf(username);
          if (userIdx > -1) {
            // Toggle off: remove user
            reactions[existingReactionIndex].users.splice(userIdx, 1);
            if (reactions[existingReactionIndex].users.length === 0) {
              reactions.splice(existingReactionIndex, 1);
            }
          } else {
            // Add user to existing emoji
            reactions[existingReactionIndex].users.push(username);
          }
        } else {
          // Add new emoji reaction
          reactions.push({ emoji, users: [username] });
        }

        message.reactions = reactions;
        message.markModified('reactions');
        await message.save();

        logger.info(
          { messageId, roomId, emoji, username, podName: env.POD_NAME },
          'Message reaction updated and broadcasted'
        );

        const reactionPayload = {
          messageId: message._id.toString(),
          roomId,
          reactions: message.reactions,
        };

        // Broadcast reaction update across all pods via Redis Pub/Sub
        io.to(roomId).emit('message_reaction_updated', reactionPayload);

        // Immediate acknowledgment back to sender
        if (callback) {
          callback({ success: true, ...reactionPayload });
        }
      } catch (err: any) {
        logger.error({ err: err.message }, 'Error handling react_message event');
        wsErrorsCounter.inc({ pod_name: env.POD_NAME, error_type: 'react_message_error' });
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // 5. Typing Indicator
    socket.on('typing', (data: { roomId: string; username: string; isTyping: boolean }) => {
      const { roomId, username, isTyping } = data;
      if (roomId && username) {
        socket.to(roomId).emit('user_typing', {
          username,
          isTyping,
          roomId,
        });
      }
    });

    // 5. Disconnect Lifecycle
    socket.on('disconnect', (reason) => {
      wsActiveConnections.dec({ pod_name: env.POD_NAME });

      logger.info(
        { socketId: socket.id, podName: env.POD_NAME, reason },
        'Client disconnected from WebSocket'
      );

      const currentRoom = socket.data.currentRoom;
      const user = socket.data.user;
      if (currentRoom && user) {
        socket.to(currentRoom).emit('user_left', {
          username: user.username,
          roomId: currentRoom,
          servedByPod: env.POD_NAME,
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  ioInstance = io;
  return io;
}
