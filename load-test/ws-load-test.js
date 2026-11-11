import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// ==============================================================================
// K6 LOAD TESTING SCRIPT: KIỂM THỬ TẢI WEBSOCKET ĐA POD (>100 CONCURRENT USERS)
// # Đồ án DevOps: Đề tài 5 - Hệ thống Web Chat thời gian thực
// # Cách chạy: k6 run load-test/ws-load-test.js
// ==============================================================================

// Định nghĩa Custom Metrics cho SRE / Performance Engineers
const messagesSent = new Counter('chat_messages_sent');
const messagesReceived = new Counter('chat_messages_received');
const wsConnectionTime = new Trend('ws_connection_time_ms');
const messageLatency = new Trend('ws_message_roundtrip_latency_ms');

export const options = {
  stages: [
    { duration: '30s', target: 25 },   // Giai đoạn 1: Khởi động tăng dần lên 25 users
    { duration: '1m',  target: 100 },  // Giai đoạn 2: Tăng tốc lên 100 concurrent WebSocket users
    { duration: '2m',  target: 120 },  // Giai đoạn 3: Giữ tải đỉnh 120 kết nối liên tục bắn tin nhắn
    { duration: '30s', target: 0 },    // Giai đoạn 4: Hạ tải an toàn
  ],
  thresholds: {
    // 95% thời gian kết nối WebSocket phải dưới 500ms
    ws_connection_time_ms: ['p(95)<500'],
    // Độ trễ gửi nhận tin nhắn P95 phải dưới 250ms
    ws_message_roundtrip_latency_ms: ['p(95)<250'],
    // Tỷ lệ kiểm tra thành công phải đạt trên 98%
    checks: ['rate>0.98'],
  },
};

const TARGET_HOST = __ENV.TARGET_HOST || 'localhost:8080';
const WS_URL = `ws://${TARGET_HOST}/socket.io/?EIO=4&transport=websocket`;

export default function () {
  const vuId = __VU;
  const username = `k6_bot_${vuId}`;
  const rooms = ['general', 'devops', 'kubernetes', 'random'];
  const room = rooms[vuId % rooms.length];

  const connectStart = Date.now();

  const res = ws.connect(WS_URL, {}, function (socket) {
    wsConnectionTime.add(Date.now() - connectStart);

    socket.on('open', function () {
      // 1. Gửi gói tin bắt tay Engine.IO 40 (Connect)
      socket.send('40');

      // 2. Tham gia vào phòng chat
      const joinPayload = `42["join_room",{"roomId":"${room}","username":"${username}"}]`;
      socket.send(joinPayload);

      // 3. Chu kỳ định kỳ gửi tin nhắn (Mỗi bot gửi 1 tin nhắn sau mỗi 2 - 4 giây)
      socket.setInterval(function () {
        const sendTime = Date.now();
        const msgText = `LoadTest message from ${username} at ${new Date().toISOString()}`;
        const messagePayload = `42["send_message",{"roomId":"${room}","sender":"${username}","text":"${msgText}","sentAt":${sendTime}}]`;

        socket.send(messagePayload);
        messagesSent.add(1);
      }, 3000);
    });

    socket.on('message', function (data) {
      // Socket.io Ping-Pong Heartbeat keep-alive (2 -> 3)
      if (data === '2') {
        socket.send('3');
        return;
      }

      // Xử lý gói tin Socket.io event (42[...])
      if (typeof data === 'string' && data.startsWith('42')) {
        try {
          const eventData = JSON.parse(data.substring(2));
          const eventName = eventData[0];
          const payload = eventData[1];

          if (eventName === 'new_message') {
            messagesReceived.add(1);
            if (payload.sender === username && payload.sentAt) {
              const latency = Date.now() - payload.sentAt;
              messageLatency.add(latency);
            }
          }
        } catch (e) {
          // Bỏ qua lỗi parse chuỗi phi chuẩn
        }
      }
    });

    socket.on('error', function (e) {
      console.error(`WebSocket error on VU ${vuId}:`, e.error());
    });

    // Giữ kết nối mở trong 45 giây trước khi kết thúc iteration
    socket.setTimeout(function () {
      socket.close();
    }, 45000);
  });

  check(res, {
    'WebSocket handshake response 101 Switching Protocols': (r) => r && r.status === 101,
  });

  sleep(1);
}
