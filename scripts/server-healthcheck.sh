#!/usr/bin/env bash
# ==============================================================================
# SCRIPT QUẢN TRỊ LINUX & SRE: BÁO CÁO SỨC KHỎE HỆ THỐNG (HEALTHCHECK)
# Đồ án DevOps: Đề tài 5 - Hệ thống Web Chat thời gian thực
# Chức năng:
#   - Đo lường và đánh giá ngưỡng tải CPU (Load Average & % CPU)
#   - Phân tích chi tiết dung lượng RAM (Used, Free, Buff/Cache, Swap)
#   - Quét phân vùng Disk (Cảnh báo khi dung lượng sử dụng vượt quá 85%)
#   - Kiểm tra trạng thái các dịch vụ cốt lõi (Docker, K3s, Fail2ban, UFW)
#   - Kiểm tra các Port mạng quan trọng (22, 80, 443, 6443, 27017, 6379)
# ==============================================================================

set -euo pipefail

# Màu hiển thị
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}==============================================================================${NC}"
echo -e "${CYAN}${BOLD}           BÁO CÁO TỔNG QUAN SỨC KHỎE HỆ THỐNG (SRE SERVER HEALTHCHECK)       ${NC}"
echo -e "${CYAN}${BOLD}==============================================================================${NC}"
echo -e "Thời gian kiểm tra : $(date +'%Y-%m-%d %H:%M:%S %Z')"
echo -e "Hostname           : $(hostname)"
echo -e "Kernel Release     : $(uname -r)"
echo -e "Uptime             : $(uptime -p 2>/dev/null || uptime | awk -F'( |,|:)+' '{print $6,"hrs,"}')"
echo "------------------------------------------------------------------------------"

# 1. KIỂM TRA TẢI CPU
echo -e "\n${BOLD}[1] TẢI VÀ HIỆU NĂNG CPU${NC}"
CPU_CORES=$(nproc)
LOAD_1M=$(awk '{print $1}' /proc/loadavg)
LOAD_5M=$(awk '{print $2}' /proc/loadavg)
LOAD_15M=$(awk '{print $3}' /proc/loadavg)

echo -e "Số lượng CPU Cores : ${CPU_CORES}"
echo -e "Load Average (1m, 5m, 15m) : ${LOAD_1M}, ${LOAD_5M}, ${LOAD_15M}"

# Cảnh báo nếu Load 1m vượt quá số CPU Cores
if (( $(echo "${LOAD_1M} > ${CPU_CORES}" | bc -l) )); then
    echo -e "${RED}⚠ CẢNH BÁO: Tải CPU 1m (${LOAD_1M}) đang vượt quá năng lực xử lý (${CPU_CORES} cores)!${NC}"
else
    echo -e "${GREEN}✓ Mức tải CPU nằm trong giới hạn an toàn.${NC}"
fi

# 2. KIỂM TRA BỘ NHỚ RAM
echo -e "\n${BOLD}[2] TRẠNG THÁI BỘ NHỚ RAM${NC}"
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
AVAIL_RAM_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
USED_RAM_KB=$((TOTAL_RAM_KB - AVAIL_RAM_KB))

TOTAL_RAM_MB=$((TOTAL_RAM_KB / 1024))
USED_RAM_MB=$((USED_RAM_KB / 1024))
AVAIL_RAM_MB=$((AVAIL_RAM_KB / 1024))
RAM_USAGE_PERCENT=$((USED_RAM_KB * 100 / TOTAL_RAM_KB))

echo -e "Tổng dung lượng RAM : ${TOTAL_RAM_MB} MB"
echo -e "Đang sử dụng        : ${USED_RAM_MB} MB (${RAM_USAGE_PERCENT}%)"
echo -e "Dung lượng còn trống: ${AVAIL_RAM_MB} MB"

if [[ ${RAM_USAGE_PERCENT} -ge 85 ]]; then
    echo -e "${RED}⚠ CẢNH BÁO: Bộ nhớ RAM đã sử dụng ${RAM_USAGE_PERCENT}% (Ngưỡng cảnh báo: 85%)!${NC}"
elif [[ ${RAM_USAGE_PERCENT} -ge 70 ]]; then
    echo -e "${YELLOW}⚡ LƯU Ý: Dung lượng RAM đang ở mức khá cao (${RAM_USAGE_PERCENT}%).${NC}"
else
    echo -e "${GREEN}✓ Trạng thái bộ nhớ RAM lý tưởng.${NC}"
fi

# 3. KIỂM TRA DUNG LƯỢNG Ổ ĐĨA (DISK SPACE)
echo -e "\n${BOLD}[3] DUNG LƯỢNG LƯU TRỮ Ổ ĐĨA${NC}"
df -h --output=target,size,used,avail,pcent -x tmpfs -x devtmpfs -x overlay | while read -r line; do
    echo "  ${line}"
done

DISK_USAGE_ROOT=$(df / --output=pcent | tail -n 1 | tr -d ' %')
if [[ ${DISK_USAGE_ROOT} -ge 85 ]]; then
    echo -e "${RED}⚠ CẢNH BÁO: Phân vùng Root (/) đã chiếm ${DISK_USAGE_ROOT}% dung lượng! Hãy dọn dẹp log hoặc docker images.${NC}"
else
    echo -e "${GREEN}✓ Dung lượng ổ đĩa phân vùng Root ổn định (${DISK_USAGE_ROOT}%).${NC}"
fi

# 4. KIỂM TRA CÁC DỊCH VỤ HỆ THỐNG QUAN TRỌNG
echo -e "\n${BOLD}[4] TRẠNG THÁI CÁC SERVICE CỐT LÕI${NC}"
SERVICES=("docker" "k3s" "fail2ban" "ufw")

for svc in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "${svc}" 2>/dev/null; then
        echo -e "  Dịch vụ [${svc}] : ${GREEN}ACTIVE (Đang chạy)${NC}"
    else
        echo -e "  Dịch vụ [${svc}] : ${YELLOW}INACTIVE / NOT INSTALLED${NC}"
    fi
done

# 5. KIỂM TRA CÁC CONTAINER NẾU DOCKER HOẠT ĐỘNG
if command -v docker &>/dev/null && systemctl is-active --quiet docker; then
    echo -e "\n${BOLD}[5] TRẠNG THÁI CÁC DOCKER CONTAINER${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
fi

# 6. KIỂM TRA KẾT NỐI MẠNG & OPEN PORTS
echo -e "\n${BOLD}[6] TRẠNG THÁI CỔNG MẠNG THIẾT YẾU${NC}"
PORTS=(22 80 443 6443 27017 6379 8080)

for p in "${PORTS[@]}"; do
    if ss -tuln 2>/dev/null | grep -q ":${p} " || netstat -tuln 2>/dev/null | grep -q ":${p} "; then
        echo -e "  Port ${p} : ${GREEN}LISTENING${NC}"
    else
        echo -e "  Port ${p} : ${YELLOW}CLOSED / NOT BOUND${NC}"
    fi
done

echo -e "\n${CYAN}==============================================================================${NC}"
echo -e "${GREEN}${BOLD}KẾT THÚC KIỂM TRA SỨC KHỎE MÁY CHỦ THÀNH CÔNG.${NC}"
echo -e "${CYAN}==============================================================================${NC}"
