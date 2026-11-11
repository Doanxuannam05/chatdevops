import http from 'http';
import { AddressInfo } from 'net';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { app } from '../../src/server';
import { initializeSocket } from '../../src/socket';
import { Message } from '../../src/models/Message';

describe('WebSocket Integration Tests', () => {
  let testServer: http.Server;
  let clientSocket: ClientSocketType;
  let serverPort: number;

  beforeAll(async () => {
    testServer = http.createServer(app);
    await initializeSocket(testServer);
    await new Promise<void>((resolve) => {
      testServer.listen(0, () => {
        const addr = testServer.address() as AddressInfo;
        serverPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    await new Promise<void>((resolve) => testServer.close(() => resolve()));
  });

  it('should establish WebSocket connection and receive pod identification handshake', async () => {
    await new Promise<void>((resolve) => {
      clientSocket = ClientSocket(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      clientSocket.on('connection_established', (data) => {
        expect(data.socketId).toBeDefined();
        expect(data.connectedPod).toBeDefined();
        expect(data.timestamp).toBeDefined();
        resolve();
      });
    });
  });

  it('should handle typing indicator event', async () => {
    await new Promise<void>((resolve) => {
      const secondClient = ClientSocket(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      secondClient.on('connect', () => {
        secondClient.emit('join_room', { roomId: 'test-room', username: 'Bob' });
        clientSocket.emit('join_room', { roomId: 'test-room', username: 'Alice' });

        setTimeout(() => {
          secondClient.on('user_typing', (data) => {
            expect(data.username).toBe('Alice');
            expect(data.isTyping).toBe(true);
            secondClient.disconnect();
            resolve();
          });

          clientSocket.emit('typing', {
            roomId: 'test-room',
            username: 'Alice',
            isTyping: true,
          });
        }, 100);
      });
    });
  });

  it('should handle message reaction event and broadcast reaction update', async () => {
    const mockMessage: any = {
      _id: '507f1f77bcf86cd799439011',
      roomId: 'test-room',
      reactions: [],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Message, 'findOne').mockResolvedValue(mockMessage);

    await new Promise<void>((resolve) => {
      const secondClient = ClientSocket(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      secondClient.on('connect', () => {
        secondClient.emit('join_room', { roomId: 'test-room', username: 'Bob' });
        clientSocket.emit('join_room', { roomId: 'test-room', username: 'Alice' });

        setTimeout(() => {
          secondClient.on('message_reaction_updated', (data) => {
            expect(data.messageId).toBe('507f1f77bcf86cd799439011');
            expect(data.roomId).toBe('test-room');
            expect(data.reactions).toEqual([
              { emoji: '👍', users: ['Alice'] },
            ]);
            secondClient.disconnect();
            resolve();
          });

          clientSocket.emit('react_message', {
            messageId: '507f1f77bcf86cd799439011',
            roomId: 'test-room',
            emoji: '👍',
            username: 'Alice',
          });
        }, 100);
      });
    });
  });
});
