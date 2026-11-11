terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project   = "realtime-chat-devops"
      ManagedBy = "Terraform"
    }
  }
}

# 1. MẠNG VPC VÀ ROUTING
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "chat-devops-vpc-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "chat-devops-igw-${var.environment}"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"

  tags = {
    Name = "chat-devops-public-subnet"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "chat-devops-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# 2. SSH KEY PAIR
resource "aws_key_pair" "deployer" {
  key_name   = "chat-devops-deployer-key"
  public_key = file(var.ssh_public_key_path)
}

# 3. SECURITY GROUPS (DevSecOps - Least Privilege)
# Security Group cho Jenkins Controller
resource "aws_security_group" "jenkins" {
  name        = "jenkins-sg-${var.environment}"
  description = "Quy tac tuong lua cho may chu Jenkins CI/CD"
  vpc_id      = aws_vpc.main.id

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH Admin Access"
  }

  # Jenkins Dashboard UI
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Jenkins Web Interface"
  }

  # Node Exporter
  ingress {
    from_port   = 9100
    to_port     = 9100
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Prometheus Scrape Metrics"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound internet traffic"
  }

  tags = {
    Name = "jenkins-sg"
  }
}

# Security Group cho K3s Cluster (Master + Worker)
resource "aws_security_group" "k3s" {
  name        = "k3s-cluster-sg-${var.environment}"
  description = "Quy tac tuong lua cho cum Kubernetes K3s"
  vpc_id      = aws_vpc.main.id

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH Access"
  }

  # HTTP Web Ingress
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Nginx Ingress HTTP"
  }

  # HTTPS Secure Ingress
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Nginx Ingress HTTPS"
  }

  # K3s API Server
  ingress {
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Kubernetes API Server Endpoint"
  }

  # Giao tiếp nội bộ giữa các Node trong cụm K3s (Flannel CNI & Kubelet)
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
    description = "Internal K3s Cluster Inter-node Communication"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "k3s-cluster-sg"
  }
}

# 4. KHỞI TẠO CÁC MÁY CHỦ QUA MODULE COMPUTE_NODE
# Máy chủ 1: Jenkins CI/CD Server
module "jenkins_node" {
  source             = "./modules/compute_node"
  node_name          = "jenkins-ci-server"
  role               = "jenkins"
  instance_type      = var.jenkins_instance_type
  subnet_id          = aws_subnet.public.id
  security_group_ids = [aws_security_group.jenkins.id]
  key_name           = aws_key_pair.deployer.key_name
  disk_size_gb       = 50
  environment        = var.environment
}

# Máy chủ 2: K3s Master Node (Control Plane)
module "k3s_master" {
  source             = "./modules/compute_node"
  node_name          = "k3s-master-node"
  role               = "k3s-master"
  instance_type      = var.k3s_master_instance_type
  subnet_id          = aws_subnet.public.id
  security_group_ids = [aws_security_group.k3s.id]
  key_name           = aws_key_pair.deployer.key_name
  disk_size_gb       = 35
  environment        = var.environment
}

# Máy chủ 3: K3s Worker Node
module "k3s_worker" {
  source             = "./modules/compute_node"
  node_name          = "k3s-worker-node-1"
  role               = "k3s-worker"
  instance_type      = var.k3s_worker_instance_type
  subnet_id          = aws_subnet.public.id
  security_group_ids = [aws_security_group.k3s.id]
  key_name           = aws_key_pair.deployer.key_name
  disk_size_gb       = 35
  environment        = var.environment
}
