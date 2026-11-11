output "instance_id" {
  description = "ID của EC2 instance"
  value       = aws_instance.this.id
}

output "public_ip" {
  description = "Địa chỉ IP Public của máy chủ"
  value       = aws_instance.this.public_ip
}

output "private_ip" {
  description = "Địa chỉ IP Private nội bộ trong VPC"
  value       = aws_instance.this.private_ip
}

output "node_name" {
  description = "Tên Node đã gán nhãn"
  value       = var.node_name
}
