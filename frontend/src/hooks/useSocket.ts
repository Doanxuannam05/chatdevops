import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface MessageReaction {
  emoji: string;
  users: string[];
}

export interface ChatMessage {
  _id: string;
  roomId: string;
  sender: string;
  avatar: string;
  text: string;
  senderPod: string;
  reactions?: MessageReaction[];
  createdAt: string;
}

export interface UserProfile {
  username: string;
  avatar: string;
  isOnline: boolean;
}

export const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    _id: 'sample-1',
    roomId: 'namdoan',
    sender: 'dd',
    avatar: '3', // avatar robot bạc hà
    text: 'Nghỉ giải lao 5 phút nhé!',
    senderPod: 'backend-pod-beta',
    createdAt: '2026-11-10T20:07:00Z',
  },
  {
    _id: 'sample-2',
    roomId: 'namdoan',
    sender: 'dd',
    avatar: '3', // avatar robot bạc hà
    text: 'Deploy thành công rồi!',
    senderPod: 'backend-pod-alpha',
    createdAt: '2026-11-10T01:36:00Z',
  },
  {
    _id: 'sample-3',
    roomId: 'namdoan',
    sender: 'namdoan',
    avatar: '2', // avatar vàng cười
    text: 'ok giỏi',
    senderPod: 'backend-pod-alpha',
    createdAt: '2026-11-10T01:37:00Z',
  },
  {
    _id: 'sample-4',
    roomId: 'namdoan',
    sender: 'duong',
    avatar: '1', // avatar hồng, là mình
    text: 'hi tôi mới tham gia',
    senderPod: 'backend-pod-alpha',
    createdAt: '2026-11-10T01:37:30Z',
  },
];

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedPod, setConnectedPod] = useState<string>('backend-pod-beta');
  const [socketId, setSocketId] = useState<string>('');
  const [latency, setLatency] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>(SAMPLE_MESSAGES);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string>('namdoan');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('chat_devops_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Keep fresh references for use in socket event listeners
  const currentRoomRef = useRef(currentRoom);
  currentRoomRef.current = currentRoom;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    const performSyncOnConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id || '');

      // 1. Sync user session if already logged in
      if (currentUserRef.current) {
        socket.emit('user_login', {
          username: currentUserRef.current.username,
          avatar: currentUserRef.current.avatar,
        });
      }

      // 2. Automatically join current room on connection & reconnection
      socket.emit('join_room', {
        roomId: currentRoomRef.current,
        username: currentUserRef.current?.username,
      });
    };

    socket.on('connect', performSyncOnConnect);

    socket.on('connection_established', (data: { socketId: string; connectedPod: string }) => {
      if (data?.connectedPod) {
        setConnectedPod(data.connectedPod);
      }
      setSocketId(data.socketId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle incoming messages (broadcasted from any pod via Redis Pub/Sub)
    socket.on('new_message', (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
    });

    // Handle realtime reactions update from Redis Pub/Sub
    socket.on('message_reaction_updated', (data: { messageId: string; roomId: string; reactions: MessageReaction[] }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg
        )
      );
    });

    // Handle typing indicators
    socket.on('user_typing', (data: { username: string; isTyping: boolean; roomId: string }) => {
      if (data.roomId === currentRoomRef.current) {
        setTypingUsers((prev) => {
          if (data.isTyping) {
            return prev.includes(data.username) ? prev : [...prev, data.username];
          } else {
            return prev.filter((u) => u !== data.username);
          }
        });
      }
    });

    socket.on('user_joined', (data: { username: string; roomId: string; servedByPod: string }) => {
      console.log(`[Event] User ${data.username} joined room ${data.roomId} via ${data.servedByPod}`);
    });

    // Heartbeat latency tracker (ping calculation)
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        const start = Date.now();
        socket.emit('ping_check', () => {
          setLatency(Date.now() - start);
        });
      }
    }, 5000);

    return () => {
      clearInterval(pingInterval);
      socket.disconnect();
    };
  }, []);

  // Fetch room messages from REST API when room changes, and emit join_room
  useEffect(() => {
    let isSubscribed = true;

    async function loadRoomHistory() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/rooms/${currentRoom}/messages`);
        if (res.ok) {
          const history = await res.json();
          if (isSubscribed) {
            if (Array.isArray(history) && history.length > 0) {
              setMessages(history);
            } else if (currentRoom === 'namdoan') {
              setMessages(SAMPLE_MESSAGES);
            } else {
              setMessages([]);
            }
          }
        }
      } catch (err) {
        if (currentRoom === 'namdoan') {
          setMessages(SAMPLE_MESSAGES);
        }
      }
    }

    loadRoomHistory();

    if (socketRef.current?.connected) {
      socketRef.current.emit('join_room', {
        roomId: currentRoom,
        username: currentUser?.username,
      });
    }

    setTypingUsers([]);

    return () => {
      isSubscribed = false;
    };
  }, [currentRoom]);

  const joinRoom = useCallback(
    (roomId: string) => {
      if (roomId === currentRoom) return;
      setCurrentRoom(roomId);
      if (socketRef.current?.connected) {
        socketRef.current.emit('join_room', {
          roomId,
          username: currentUser?.username,
        });
      }
    },
    [currentRoom, currentUser]
  );

  const sendMessage = useCallback(
    (text: string) => {
      if (!currentUser || !text.trim()) {
        return;
      }
      const trimmedText = text.trim();

      const optimisticMsg: ChatMessage = {
        _id: `temp-${Date.now()}`,
        roomId: currentRoom,
        sender: currentUser.username,
        avatar: currentUser.avatar || '1',
        text: trimmedText,
        senderPod: connectedPod || 'backend-pod-alpha',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      if (socketRef.current?.connected) {
        socketRef.current.emit(
          'send_message',
          {
            roomId: currentRoom,
            sender: currentUser.username,
            avatar: currentUser.avatar,
            text: trimmedText,
          },
          (res: any) => {
            if (res?.success && res.message) {
              setMessages((prev) =>
                prev.map((m) => (m._id === optimisticMsg._id ? res.message : m))
              );
            }
          }
        );
      } else {
        socketRef.current?.connect();
      }
    },
    [currentRoom, currentUser, connectedPod]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current || !socketRef.current.connected || !currentUser) return;
      socketRef.current.emit('typing', {
        roomId: currentRoom,
        username: currentUser.username,
        isTyping,
      });
    },
    [currentRoom, currentUser]
  );

  const reactMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (!currentUser || !messageId) {
        return;
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id !== messageId) return msg;

          const reactions = [...(msg.reactions || [])];
          const rxIndex = reactions.findIndex((r) => r.emoji === emoji);

          if (rxIndex > -1) {
            const userIndex = reactions[rxIndex].users.indexOf(currentUser.username);
            const updatedUsers = [...reactions[rxIndex].users];
            if (userIndex > -1) {
              updatedUsers.splice(userIndex, 1);
            } else {
              updatedUsers.push(currentUser.username);
            }

            if (updatedUsers.length === 0) {
              reactions.splice(rxIndex, 1);
            } else {
              reactions[rxIndex] = { ...reactions[rxIndex], users: updatedUsers };
            }
          } else {
            reactions.push({ emoji, users: [currentUser.username] });
          }

          return { ...msg, reactions };
        })
      );

      if (socketRef.current?.connected) {
        socketRef.current.emit(
          'react_message',
          {
            messageId,
            roomId: currentRoom,
            emoji,
            username: currentUser.username,
          },
          (res: any) => {
            if (res?.success && res.reactions) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg._id === res.messageId ? { ...msg, reactions: res.reactions } : msg
                )
              );
            }
          }
        );
      }
    },
    [currentRoom, currentUser]
  );

  const login = useCallback(
    (username: string, customAvatar?: string) => {
      const avatar = customAvatar || '1';
      const profile: UserProfile = { username, avatar, isOnline: true };
      setCurrentUser(profile);
      localStorage.setItem('chat_devops_user', JSON.stringify(profile));

      if (socketRef.current?.connected) {
        socketRef.current.emit('user_login', { username, avatar });
        socketRef.current.emit('join_room', { roomId: currentRoom, username });
      }
    },
    [currentRoom]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('chat_devops_user');
  }, []);

  return {
    isConnected,
    connectedPod,
    socketId,
    latency,
    messages,
    typingUsers,
    currentRoom,
    currentUser,
    joinRoom,
    sendMessage,
    sendTyping,
    reactMessage,
    login,
    logout,
  };
}
