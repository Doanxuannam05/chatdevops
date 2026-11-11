# Tìm kiếm AMI Ubuntu 22.04 LTS chính thức từ Canonical
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Khởi tạo EC2 Instance
resource "aws_instance" "this" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = var.security_group_ids
  key_name                    = var.key_name
  associate_public_ip_address = true

  root_block_device {
    volume_size           = var.disk_size_gb
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name        = "${var.node_name}-root-ebs"
      Environment = var.environment
    }
  }

  user_data = var.custom_user_data != "" ? var.custom_user_data : <<-EOF
              #!/bin/bash
              hostnamectl set-hostname ${var.node_name}
              echo "127.0.0.1 ${var.node_name}" >> /etc/hosts
              apt-get update -y
              apt-get install -y curl jq htop
              EOF

  tags = {
    Name        = var.node_name
    Role        = var.role
    Environment = var.environment
    Project     = "realtime-chat-devops"
    ManagedBy   = "Terraform"
  }

  lifecycle {
    ignore_changes = [ami]
  }
}
