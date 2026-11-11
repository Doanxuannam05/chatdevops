output "jenkins_public_ip" {
  description = "Địa chỉ IP Public của máy chủ Jenkins"
  value       = module.jenkins_node.public_ip
}

output "jenkins_url" {
  description = "Đường dẫn truy cập giao diện Jenkins"
  value       = "http://${module.jenkins_node.public_ip}:8080"
}

output "k3s_master_public_ip" {
  description = "Địa chỉ IP Public của máy chủ K3s Master (Control Plane)"
  value       = module.k3s_master.public_ip
}

output "k3s_worker_public_ip" {
  description = "Địa chỉ IP Public của máy chủ K3s Worker"
  value       = module.k3s_worker.public_ip
}

output "ansible_inventory_template" {
  description = "Mẫu cấu hình Ansible Inventory tự động sinh ra từ Terraform"
  value       = <<-EOT
[jenkins_controller]
${module.jenkins_node.public_ip} ansible_user=ubuntu node_name=jenkins-ci-server

[k3s_master]
${module.k3s_master.public_ip} ansible_user=ubuntu node_name=k3s-master-node

[k3s_workers]
${module.k3s_worker.public_ip} ansible_user=ubuntu node_name=k3s-worker-node-1

[all:vars]
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
  EOT
}
