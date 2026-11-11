# SỔ TAY VẬN HÀNH & KỊCH BẢN BẢO VỆ ĐỒ ÁN (RUNBOOK & DEFENSE GUIDE)
## ĐỒ ÁN TỐT NGHIỆP DEVOPS - ĐỀ TÀI 5: HỆ THỐNG WEB CHAT THỜI GIAN THỰC ĐA POD

---

## 📑 MỤC LỤC
1. [Kiến trúc & Cơ chế Đồng bộ Đa Pod](#1-kiến-trúc--cơ-chế-đồng-bộ-đa-pod)
2. [Hướng dẫn Khởi động Nhanh bằng 1 Lệnh (Quickstart)](#2-hướng-dẫn-khởi-động-nhanh-bằng-1-lệnh-quickstart)
3. [Kịch bản 8 Bước Demo Trực tiếp Trước Hội đồng Vấn đáp](#3-kịch-bản-8-bước-demo-trực-tiếp-trước-hội-đồng-vấn-đáp)
4. [Quy trình Vận hành, Giám sát & Xử lý Sự cố (Incident Response)](#4-quy-trình-vận-hành-giám-sát--xử-lý-sự-cố-incident-response)
5. [Quy trình Sao lưu & Phục hồi CSDL (Backup & Disaster Recovery)](#5-quy-trình-sao-lưu--phục-hồi-csdl-backup--disaster-recovery)
6. [Quy trình Rollback Phiên bản Khi Gặp Sự cố (Zero-Downtime Rollback)](#6-quy-trình-rollback-phiên-bản-khi-gặp-sự-cố-zero-downtime-rollback)

---

## 1. KIẾN TRÚC & CƠ CHẾ ĐỒNG BỘ ĐA POD

### 1.1 Vấn đề Cốt lõi của WebSocket trên Đa Pod
Thông thường, giao thức WebSocket duy trì một kết nối TCP liên tục (stateful) giữa Client và một Pod cụ thể:
- Nếu **User A** kết nối tới **Pod 1** và **User B** kết nối tới **Pod 2**, nếu chỉ dùng bộ nhớ RAM cục bộ của Node.js, khi User A gửi tin nhắn thì chỉ những ai đang nối vào Pod 1 mới nhận được. **User B trên Pod 2 sẽ hoàn toàn không nhận được tin nhắn!**

### 1.2 Giải pháp Kiến trúc Cloud-Native
Hệ thống giải quyết triệt để vấn đề này bằng cách tích hợp **Redis Pub/Sub Adapter (`@socket.io/redis-adapter`)**:
1. Khi User A gửi tin nhắn lên Pod 1:
   - Pod 1 ghi nhận tin nhắn, gán nhãn `senderPod: "backend-pod-alpha"`.
   - Pod 1 lưu trữ tin nhắn vào MongoDB để lưu lịch sử lâu dài.
   - Pod 1 phát hành (Publish) sự kiện tin nhắn vào kênh Redis Channel.
2. Redis đóng vai trò Message Broker phân phối tức thì sự kiện đó đến **tất cả các Pod Backend còn lại** đang đăng ký (Subscribe).
3. Pod 2 nhận được sự kiện từ Redis và truyền (Emit) trực tiếp qua kết nối WebSocket nội bộ tới User B!
4. Frontend hiển thị huy hiệu: `Processed by: backend-pod-alpha` để chứng minh tin nhắn được điều phối thành công qua Broker.

---

## 2. HƯỚNG DẪN KHỞI ĐỘNG NHANH BẰNG 1 LỆNH (QUICKSTART)

### Cách 1: Khởi động toàn bộ Cụm bằng Docker Compose (Khuyên dùng khi Vấn đáp trên Laptop)
Chỉ cần chạy 1 lệnh duy nhất tại thư mục gốc của dự án:
```bash
docker compose up --build -d
```
Kiểm tra trạng thái các container:
```bash
docker compose ps
```
Hệ thống sẽ khởi tạo 5 container:
- `chat-devops-mongodb` (Port `27017`): Cơ sở dữ liệu NoSQL
- `chat-devops-redis` (Port `6379`): Redis Pub/Sub Message Broker
- `chat-devops-backend-1` (Port `5001` -> `5000` nội bộ): Backend Pod Alpha
- `chat-devops-backend-2` (Port `5002` -> `5000` nội bộ): Backend Pod Beta
- `chat-devops-frontend` (Port `3000`): Nginx Web Server + Cân bằng tải Round-robin ngược về 2 Pod Backend (tránh trùng port 8080 với Jenkins)

Truy cập ứng dụng tại: **`http://localhost:3000`**

---

## 3. KỊCH BẢN 8 BƯỚC DEMO TRỰC TIẾP TRƯỚC HỘI ĐỒNG VẤN ĐÁP

### 🎯 BƯỚC 1: Chứng minh Tính Sẵn sàng của Toàn Cụm (Cluster Health)
1. Mở trình duyệt truy cập: `http://localhost:3000/health`
2. **Giải thích với Thầy/Cô**:
   - Trạng thái trả về HTTP `200 OK` dạng JSON.
   - Báo cáo rõ: `status: "healthy"`, `podName`, `services.mongodb: "connected"`, `services.redis: "connected"`, chỉ số RAM `memoryRssMb`.
   - Chứng minh cơ chế Healthcheck/ReadinessProbe đã sẵn sàng đón nhận lưu lượng mạng.

### 🎯 BƯỚC 2: Mở 2 Trình duyệt Song song Giả lập 2 Người dùng trên 2 Pod
1. Mở một cửa sổ trình duyệt thường (Chrome) truy cập `http://localhost:3000`.
   - Đăng nhập với tên: `Alice_SRE`
   - Quan sát thanh trạng thái đỉnh (Top Bar): Giả sử kết nối vào `Pod: backend-pod-alpha`.
2. Mở một cửa sổ ẩn danh (Incognito Window) hoặc trình duyệt thứ hai (Firefox/Edge) truy cập `http://localhost:3000`.
   - Đăng nhập với tên: `Bob_DevOps`
   - Quan sát thanh trạng thái đỉnh: Kết nối vào `Pod: backend-pod-beta`.

### 🎯 BƯỚC 3: Demo Đồng bộ Tin nhắn Xuyên Pod qua Redis Pub/Sub
1. Cả hai người dùng cùng vào phòng `#devops`.
2. `Alice_SRE` gõ tin nhắn: `"Chào Bob, cụm Kubernetes hôm nay hoạt động thế nào?"` và bấm Gửi.
3. **Hiện tượng quan sát**:
   - Màn hình của `Bob_DevOps` ngay lập tức nhận được tin nhắn trong vòng vài mili-giây!
   - Tại bong bóng tin nhắn, phần metadata hiển thị rõ ràng: `Processed by: backend-pod-alpha`.
4. `Bob_DevOps` gõ phản hồi: `"Cụm K3s và Redis Pub/Sub đang đồng bộ 100%!"` và bấm Gửi.
   - Màn hình của `Alice_SRE` nhận được tin nhắn với nhãn: `Processed by: backend-pod-beta`.
5. **Khẳng định với Hội đồng**: Hai client nối vào hai Pod vật lý độc lập nhưng tin nhắn được truyền nhận thời gian thực qua Redis Pub/Sub Broker, không hề bị cô lập!

### 🎯 BƯỚC 4: Kiểm tra Chỉ số Prometheus Metrics
1. Truy cập trực tiếp endpoint: `http://localhost:3000/metrics`
2. Tìm kiếm (Ctrl+F) các chỉ số cốt lõi:
   - `ws_active_connections{pod_name="..."}`: Thấy rõ số lượng kết nối WebSocket trên từng Pod.
   - `ws_messages_total{room="devops", sender_pod="..."}`: Đếm tổng số tin nhắn đã chuyển tiếp qua Redis.
   - `http_requests_total`: Đếm toàn bộ request phân loại theo mã HTTP (200, 500,...).

### 🎯 BƯỚC 5: Kích hoạt Mô phỏng Lỗi (Simulate Error) & Cảnh báo Alertmanager
1. Trên giao diện Web Chat của bất kỳ user nào, bấm nút màu đỏ trên thanh trạng thái: **`Trigger 500`**.
2. Hoặc mở tab mới gọi: `http://localhost:3000/api/simulate-error?type=500`
3. Nhấp liên tục 5-10 lần để tạo chuỗi lỗi HTTP 500.
4. Mở Prometheus Alerts (`http://localhost:9090/alerts` hoặc Alertmanager):
   - Quy tắc **`High5xxErrorRate`** chuyển từ trạng thái `Inactive` -> `Pending` -> `Firing`!
   - Thông báo sự cố lập tức được gửi tới Webhook Discord/Telegram kèm thông tin Pod gặp lỗi!

### 🎯 BƯỚC 6: Trình diễn Thu thập Log Tập trung qua Loki & Promtail
1. Giải thích với Thầy/Cô: Hệ thống sử dụng thư viện **Pino** xuất chuẩn JSON trực tiếp ra `stdout`.
2. Kiểm tra log từ terminal:
   ```bash
   docker logs chat-devops-backend-1 | grep "error"
   ```
3. Log có cấu trúc rõ ràng:
   ```json
   {"level":"error","time":"2026-10-29T18:00:00.000Z","service":"chat-backend","podName":"backend-pod-alpha","msg":"Simulated internal server error (HTTP 500)"}
   ```
4. Trên Grafana Loki, truy vấn: `{service="chat-backend", level="error"}` -> Toàn bộ dòng log sự cố hiện ra với đầy đủ stacktrace và timestamp.

### 🎯 BƯỚC 7: Demo Tự động Co giãn Tải (Horizontal Pod Autoscaling - HPA)
1. Bấm nút **`Spike CPU (HPA)`** trên thanh công cụ hoặc chạy kịch bản kiểm thử tải k6:
   ```bash
   k6 run load-test/ws-load-test.js
   ```
2. Mở terminal kiểm tra trạng thái HPA trong cụm Kubernetes:
   ```bash
   kubectl get hpa backend-hpa -w
   ```
3. **Hiện tượng quan sát**: Khi tải CPU vượt quá 60%, HPA tự động kích hoạt scale-out số lượng Pod từ **2 Pods lên 4, 6 hoặc 8 Pods**!

### 🎯 BƯỚC 8: Thử nghiệm Khả năng Tự phục hồi (Chaos Engineering / Self-Healing)
1. Trong khi Alice và Bob vẫn đang mở chat, cố tình "tiêu diệt" một Pod backend:
   ```bash
   docker stop chat-devops-backend-1
   # Hoặc trên K8s:
   kubectl delete pod -l app=backend --now
   ```
2. `Bob` gửi tiếp một tin nhắn: Tin nhắn vẫn đến tay `Alice` bình thường vì Nginx/K8s tự động định tuyến sang Pod còn sống!
3. Trong Kubernetes, ReplicaSet lập tức khởi tạo Pod thay thế mới chỉ sau 3 giây để đảm bảo luôn duy trì đủ số lượng replica tối thiểu!

---

## 4. QUY TRÌNH VẬN HÀNH, GIÁM SÁT & XỬ LÝ SỰ CỐ (INCIDENT RESPONSE)

### Bảng mã lỗi và Hướng xử lý nhanh

| Tên Cảnh báo (Alert) | Nguyên nhân khả dĩ | Lệnh điều tra và Hành động khắc phục |
| :--- | :--- | :--- |
| **`HighWebSocketConnections`** | Lượng người dùng tăng đột biến hoặc bị tấn công DDOS WebSocket | `kubectl get hpa` (Xem HPA đã scale chưa). Nếu cần, scale thủ công: `kubectl scale deployment chat-backend --replicas=6` |
| **`High5xxErrorRate`** | Mất kết nối CSDL MongoDB hoặc lỗi cú pháp code | Xem log khẩn cấp: `kubectl logs -l app=backend --tail=100 \| grep error`. Kiểm tra trạng thái mongo: `kubectl get pods -l app=mongodb` |
| **`HighLatencyP95`** | Redis Broker bị nghẽn RAM hoặc truy vấn MongoDB thiếu Index | Kiểm tra bộ nhớ Redis: `docker exec chat-devops-redis redis-cli info memory`. Kiểm tra mongo indexes: `mongosh --eval 'db.messages.getIndexes()'` |
| **`PodCrashLooping`** | Thiếu biến môi trường hoặc OOM (Hết RAM) | `kubectl describe pod <pod-name>` (Kiểm tra xem có dính `OOMKilled` hay `Exit Code 1` không) |

---

## 5. QUY TRÌNH SAO LƯU & PHỤC HỒI CSDL (BACKUP & DISASTER RECOVERY)

### 5.1 Thực hiện Sao lưu (Backup)
Chạy script tự động đã được lập trình sẵn:
```bash
./scripts/backup-mongodb.sh
```
- File sao lưu dạng nén gzip sẽ được lưu tại: `/var/backups/mongodb/chat_devops_backup_<TIMESTAMP>.archive.gz`.
- Script tự động kiểm tra dung lượng và xóa các bản backup cũ hơn 7 ngày.

### 5.2 Khôi phục Dữ liệu (Restore)
Khi có sự cố thảm họa mất dữ liệu, chạy lệnh:
```bash
./scripts/restore-mongodb.sh /var/backups/mongodb/chat_devops_backup_20261029_180000.archive.gz --force
```

---

## 6. QUY TRÌNH ROLLBACK PHIÊN BẢN KHI GẶP SỰ CỐ (ZERO-DOWNTIME ROLLBACK)

Nếu phiên bản mới triển khai gặp lỗi nghiêm trọng trên Production:
```bash
# 1. Kiểm tra lịch sử triển khai
kubectl rollout history deployment/prod-chat-backend -n chat-production

# 2. Hoàn tác quay trở về phiên bản ổn định liền trước ngay lập tức
kubectl rollout undo deployment/prod-chat-backend -n chat-production

# 3. Theo dõi trạng thái hoàn tất rollback
kubectl rollout status deployment/prod-chat-backend -n chat-production
```
PodDisruptionBudget (`backend-pdb.yaml`) và RollingUpdate đảm bảo quá trình rollback diễn ra **không gián đoạn bất kỳ tin nhắn nào** của người dùng!
