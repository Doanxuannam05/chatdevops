variable "aws_region" {
  description = "AWS Region triển khai hạ tầng"
  type        = string
  default     = "ap-southeast-1" # Singapore Region (độ trễ thấp về Việt Nam)
}

variable "environment" {
  description = "Tên môi trường (staging hoặc production)"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "Dải mạng CIDR cho VPC dự án"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "Dải mạng CIDR cho Public Subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "ssh_public_key_path" {
  description = "Đường dẫn file SSH Public Key để truy cập các máy chủ"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "jenkins_instance_type" {
  description = "Cấu hình phần cứng cho máy chủ Jenkins CI/CD Controller"
  type        = string
  default     = "t3.large" # 2 vCPU, 8GB RAM (Đảm bảo build Docker & Test mượt mà)
}

variable "k3s_master_instance_type" {
  description = "Cấu hình phần cứng cho máy chủ K3s Control Plane (Master Node)"
  type        = string
  default     = "t3.medium" # 2 vCPU, 4GB RAM
}

variable "k3s_worker_instance_type" {
  description = "Cấu hình phần cứng cho máy chủ K3s Worker Node"
  type        = string
  default     = "t3.medium" # 2 vCPU, 4GB RAM
}
