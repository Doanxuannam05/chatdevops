#!/usr/bin/env bash
# ==============================================================================
# SCRIPT QUẢN TRỊ CƠ SỞ DỮ LIỆU: KHÔI PHỤC (RESTORE) MONGODB
# Đồ án DevOps: Đề tài 5 - Hệ thống Web Chat thời gian thực
# Cách sử dụng:
#   ./scripts/restore-mongodb.sh <duong_dan_file_backup.archive.gz> [--force]
# ==============================================================================

set -euo pipefail

# Màu sắc
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [[ $# -lt 1 ]]; then
    echo -e "${RED}[ERROR] Thiếu tham số đường dẫn file backup!${NC}"
    echo -e "Cú pháp: $0 <path_to_backup.archive.gz> [--force]"
    exit 1
fi

BACKUP_FILE="$1"
FORCE_FLAG="${2:-}"
DATABASE_NAME="${DATABASE_NAME:-chat_devops}"

if [[ ! -f "${BACKUP_FILE}" ]]; then
    echo -e "${RED}[ERROR] Không tìm thấy file backup: ${BACKUP_FILE}${NC}"
    exit 1
fi

echo -e "${YELLOW}[CẢNH BÁO] Thao tác này sẽ ghi đè (--drop) toàn bộ dữ liệu hiện tại của database [${DATABASE_NAME}]!${NC}"
if [[ "${FORCE_FLAG}" != "--force" ]]; then
    read -p "Bạn có chắc chắn muốn khôi phục không? (nhập 'yes' để xác nhận): " confirm
    if [[ "${confirm}" != "yes" ]]; then
        echo -e "${CYAN}Đã hủy bỏ thao tác khôi phục.${NC}"
        exit 0
    fi
fi

echo -e "${CYAN}[INFO] Bắt đầu quá trình phục hồi MongoDB từ ${BACKUP_FILE}...${NC}"

if command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -q "chat-devops-mongodb"; then
    echo -e "${CYAN}[INFO] Đang khôi phục vào Docker container [chat-devops-mongodb]...${NC}"
    cat "${BACKUP_FILE}" | docker exec -i chat-devops-mongodb mongorestore \
        --db="${DATABASE_NAME}" \
        --archive \
        --gzip \
        --drop
elif command -v kubectl &>/dev/null && kubectl get pods -l app=mongodb -o jsonpath="{.items[0].metadata.name}" &>/dev/null; then
    K8S_MONGO_POD=$(kubectl get pods -l app=mongodb -o jsonpath="{.items[0].metadata.name}")
    echo -e "${CYAN}[INFO] Đang khôi phục vào Kubernetes Pod [${K8S_MONGO_POD}]...${NC}"
    cat "${BACKUP_FILE}" | kubectl exec -i "${K8S_MONGO_POD}" -- mongorestore \
        --db="${DATABASE_NAME}" \
        --archive \
        --gzip \
        --drop
elif command -v mongorestore &>/dev/null; then
    MONGO_HOST="${MONGO_HOST:-127.0.0.1}"
    MONGO_PORT="${MONGO_PORT:-27017}"
    echo -e "${CYAN}[INFO] Đang khôi phục trực tiếp qua mongorestore tới ${MONGO_HOST}:${MONGO_PORT}...${NC}"
    mongorestore --host="${MONGO_HOST}" --port="${MONGO_PORT}" \
        --db="${DATABASE_NAME}" \
        --archive="${BACKUP_FILE}" \
        --gzip \
        --drop
else
    echo -e "${RED}[ERROR] Không tìm thấy công cụ mongorestore, Docker container hoặc K8s pod!${NC}"
    exit 1
fi

echo -e "${GREEN}[SUCCESS] Khôi phục cơ sở dữ liệu MongoDB [${DATABASE_NAME}] thành công rực rỡ!${NC}"
