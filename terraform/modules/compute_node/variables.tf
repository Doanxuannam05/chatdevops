variable "node_name" {
  description = "Tên định danh của Compute Node"
  type        = string
}

variable "role" {
  description = "Vai trò của Node: jenkins, k3s-master, k3s-worker"
  type        = string
}

variable "instance_type" {
  description = "Loại máy chủ EC2 (e.g. t3.medium, t3.large)"
  type        = string
  default     = "t3.medium"
}

variable "subnet_id" {
  description = "Subnet ID gắn kết mạng"
  type        = string
}

variable "security_group_ids" {
  description = "Danh sách Security Group áp dụng"
  type        = list(string)
}

variable "key_name" {
  description = "Tên SSH Key Pair trên AWS"
  type        = string
}

variable "disk_size_gb" {
  description = "Dung lượng ổ cứng root (GB)"
  type        = number
  default     = 30
}

variable "environment" {
  description = "Môi trường triển khai: staging, production"
  type        = string
  default     = "production"
}

variable "custom_user_data" {
  description = "Script cloud-init khởi tạo ban đầu"
  type        = string
  default     = ""
}
