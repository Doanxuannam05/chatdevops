#!/usr/bin/env bash
# ==============================================================================
# SCRIPT QUẢN TRỊ CƠ SỞ DỮ LIỆU: SAO LƯU (BACKUP) MONGODB ĐỊNH KỲ
# Đồ án DevOps: Đề tài 5 - Hệ thống Web Chat thời gian thực
# Chức năng:
#   - Hỗ trợ cả 3 môi trường: Local Native, Docker Compose Container, K8s Pod
#   - Nén luồng trực tiếp với định dạng Archive Gzip (--gzip --archive)
#   - Đặt tên file theo định dạng timestamp chuẩn: YYYYMMDD_HHMMSS
#   - Chính sách lưu trữ (Retention Policy): Tự động dọn dẹp bản backup > 7 ngày
#   - Kiểm tra tính toàn vẹn (Integrity check) sau khi backup
# ==============================================================================

set -euo pipefail

# Cấu hình biến môi trường
BACKUP_DIR="${BACKUP_DIR:-/var/backups/mongodb}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
DATABASE_NAME="${DATABASE_NAME:-chat_devops}"
BACKUP_FILE="${BACKUP_DIR}/${DATABASE_NAME}_backup_${TIMESTAMP}.archive.gz"
LOG_FILE="${LOG_FILE:-/var/log/mongodb-backup.log}"

# Màu sắc thông báo
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${CYAN}${msg}${NC}"
    echo "${msg}" >> "${LOG_FILE}" 2>/dev/null || true
}

error() {
    local msg="[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR] $1"
    echo -e "${RED}${msg}${NC}" >&2
    echo "${msg}" >> "${LOG_FILE}" 2>/dev/null || true
    exit 1
}

# Tạo thư mục lưu backup nếu chưa tồn tại
mkdir -p "${BACKUP_DIR}"

log "Bắt đầu quy trình sao lưu cơ sở dữ liệu MongoDB [${DATABASE_NAME}]..."

# Kiểm tra cơ chế chạy (Docker Container vs Native vs Kubernetes)
if command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -q "chat-devops-mongodb"; then
    log "Phát hiện MongoDB đang chạy trong Docker container [chat-devops-mongodb]."
    docker exec chat-devops-mongodb mongodump \
        --db="${DATABASE_NAME}" \
        --archive \
        --gzip > "${BACKUP_FILE}"
elif command -v kubectl &>/dev/null && kubectl get pods -l app=mongodb -o jsonpath="{.items[0].metadata.name}" &>/dev/null; then
    K8S_MONGO_POD=$(kubectl get pods -l app=mongodb -o jsonpath="{.items[0].metadata.name}")
    log "Phát hiện MongoDB đang chạy trong Kubernetes Pod [${K8S_MONGO_POD}]."
    kubectl exec "${K8S_MONGO_POD}" -- mongodump \
        --db="${DATABASE_NAME}" \
        --archive \
        --gzip > "${BACKUP_FILE}"
elif command -v mongodump &>/dev/null; then
    MONGO_HOST="${MONGO_HOST:-127.0.0.1}"
    MONGO_PORT="${MONGO_PORT:-27017}"
    log "Thực hiện mongodump trực tiếp tới ${MONGO_HOST}:${MONGO_PORT}..."
    mongodump --host="${MONGO_HOST}" --port="${MONGO_PORT}" \
        --db="${DATABASE_NAME}" \
        --archive="${BACKUP_FILE}" \
        --gzip
else
    error "Không tìm thấy tiện ích mongodump, Docker container hoặc Kubernetes pod MongoDB!"
fi

# Kiểm tra tính toàn vẹn và dung lượng file backup
if [[ -f "${BACKUP_FILE}" ]] && [[ -s "${BACKUP_FILE}" ]]; then
    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo -e "${GREEN}[SUCCESS] Sao lưu thành công! File: ${BACKUP_FILE} (Dung lượng: ${FILE_SIZE})${NC}"
    log "Backup hoàn tất: ${BACKUP_FILE} (${FILE_SIZE})"
else
    error "File sao lưu không tồn tại hoặc rỗng: ${BACKUP_FILE}"
fi

# Áp dụng chính sách lưu trữ (Retention Policy)
log "Thực hiện dọn dẹp các bản backup cũ hơn ${RETENTION_DAYS} ngày..."
DELETED_COUNT=$(find "${BACKUP_DIR}" -name "${DATABASE_NAME}_backup_*.archive.gz" -mtime +"${RETENTION_DAYS}" -print -delete | wc -l)
log "Đã xóa ${DELETED_COUNT} bản sao lưu cũ quá thời hạn lưu trữ."

log "Quy trình backup MongoDB kết thúc thành công mỹ mãn."
