#!/usr/bin/env bash
# ==============================================================================
# SCRIPT QUẢN TRỊ LINUX: BẢO MẬT & HARDENING MÁY CHỦ UBUNTU/DEBIAN
# Đồ án DevOps: Đề tài 5 - Hệ thống Web Chat thời gian thực
# Chức năng:
#   1. Cập nhật hệ thống & cài đặt công cụ thiết yếu (ufw, fail2ban, logrotate)
#   2. Tạo user quản trị 'devopsadmin' có quyền sudo, cấu hình SSH Key
#   3. Vô hiệu hóa đăng nhập root qua SSH & tắt Password Authentication
#   4. Cấu hình tường lửa UFW (chỉ mở 22, 80, 443, 6443)
#   5. Kích hoạt Fail2ban chống tấn công Brute Force SSH
#   6. Tối ưu Kernel Sysctl chống SYN Flood & IP Spoofing
#   7. Cấu hình Logrotate định kỳ cho ứng dụng
# ==============================================================================

set -euo pipefail

# Màu hiển thị
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

# 1. Kiểm tra quyền root
if [[ $EUID -ne 0 ]]; then
   error "Script này bắt buộc phải chạy dưới quyền root (hoặc dùng sudo)!"
fi

info "Bắt đầu quy trình Hardening Linux Server cho cụm DevOps Chat..."

# 2. Cập nhật hệ thống
info "1/7. Cập nhật danh sách gói APT và nâng cấp hệ thống..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
apt-get install -y ufw fail2ban logrotate curl jq htop ca-certificates gnupg lsb-release

# 3. Tạo user quản trị chuyên trách 'devopsadmin'
ADMIN_USER="devopsadmin"
info "2/7. Thiết lập user quản trị chuyên dụng: ${ADMIN_USER}..."

if id "${ADMIN_USER}" &>/dev/null; then
    warn "User ${ADMIN_USER} đã tồn tại, bỏ qua bước tạo user."
else
    useradd -m -s /bin/bash -G sudo "${ADMIN_USER}"
    # Cho phép sudo không cần password hoặc nhắc đổi pass
    echo "${ADMIN_USER} ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/${ADMIN_USER}"
    chmod 0440 "/etc/sudoers.d/${ADMIN_USER}"
    success "Đã tạo user ${ADMIN_USER} với quyền sudo thành công."
fi

# Thiết lập thư mục SSH cho user
USER_SSH_DIR="/home/${ADMIN_USER}/.ssh"
mkdir -p "${USER_SSH_DIR}"
chmod 700 "${USER_SSH_DIR}"

if [[ ! -f "${USER_SSH_DIR}/authorized_keys" ]]; then
    touch "${USER_SSH_DIR}/authorized_keys"
    chmod 600 "${USER_SSH_DIR}/authorized_keys"
    warn "Chưa có public key trong ${USER_SSH_DIR}/authorized_keys. Vui lòng thêm public key của bạn vào đây."
fi
chown -R "${ADMIN_USER}:${ADMIN_USER}" "/home/${ADMIN_USER}"

# 4. Bảo mật SSH Daemon (sshd)
info "3/7. Cấu hình bảo mật SSH Daemon..."
SSHD_HARDEN_CONF="/etc/ssh/sshd_config.d/99-devops-hardened.conf"

cat <<EOF > "${SSHD_HARDEN_CONF}"
# Cấu hình bảo mật SSH bởi DevSecOps
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# Kiểm tra cú pháp sshd trước khi reload tránh mất kết nối
if sshd -t; then
    systemctl restart ssh || systemctl restart sshd
    success "Đã vô hiệu hóa đăng nhập root & cấm password authentication cho SSH."
else
    error "Cú pháp cấu hình SSH không hợp lệ! Đã hủy thay đổi."
fi

# 5. Cấu hình Tường lửa UFW
info "4/7. Cấu hình Tường lửa UFW theo nguyên tắc tối thiểu quyền (Least Privilege)..."
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing

# Mở các cổng dịch vụ cần thiết:
ufw allow 22/tcp comment 'SSH Access'
ufw allow 80/tcp comment 'HTTP Web'
ufw allow 443/tcp comment 'HTTPS Secure Web'
ufw allow 6443/tcp comment 'Kubernetes K3s API'
ufw allow 9100/tcp comment 'Prometheus Node Exporter'

# Kích hoạt UFW
ufw --force enable
success "Tường lửa UFW đã được kích hoạt thành công!"

# 6. Kích hoạt Fail2ban chống tấn công Brute Force
info "5/7. Thiết lập Fail2ban bảo vệ SSH..."
cat <<EOF > /etc/fail2ban/jail.local
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port    = ssh
filter  = sshd
logpath = /var/log/auth.log
backend = systemd
EOF

systemctl enable fail2ban
systemctl restart fail2ban
success "Fail2ban đã được cấu hình và đang giám sát SSH."

# 7. Tối ưu Kernel Sysctl chống tấn công mạng
info "6/7. Tối ưu tham số nhân Kernel (Sysctl)..."
cat <<EOF > /etc/sysctl.d/99-network-hardening.conf
# Chống tấn công SYN Flood
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.tcp_synack_retries = 2

# Chống IP Spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Vô hiệu hóa IP Source Routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Bỏ qua ICMP Echo broadcast (Smurf attack protection)
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Vô hiệu hóa ICMP redirect
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
EOF

sysctl --system >/dev/null
success "Đã nạp thành công các tham số bảo mật Kernel."

# 8. Cấu hình Logrotate cho Container và ứng dụng
info "7/7. Cấu hình Logrotate định kỳ..."
cat <<EOF > /etc/logrotate.d/devops-chat-app
/var/log/chat-devops/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 devopsadmin devopsadmin
    sharedscripts
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF

success "Logrotate đã được thiết lập (lưu trữ 14 ngày, nén tự động)."

echo -e "\n=============================================================================="
echo -e "${GREEN}HOÀN TẤT HARDENING MÁY CHỦ THÀNH CÔNG!${NC}"
echo -e "User quản trị : ${CYAN}${ADMIN_USER}${NC}"
echo -e "SSH Port       : ${CYAN}22 (Chỉ chấp nhận SSH Key)${NC}"
echo -e "Firewall UFW   : ${CYAN}Active (Allow: 22, 80, 443, 6443, 9100)${NC}"
echo -e "Fail2ban       : ${CYAN}Active${NC}"
echo -e "=============================================================================="
