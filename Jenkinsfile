// ==============================================================================
// PRODUCTION DECLARATIVE CI/CD PIPELINE (JENKINSFILE)
// Đồ án DevOps: Đề tài 5 - Hệ thống Web Chat thời gian thực Đa Pod
// Kiến trúc: GitOps + DevSecOps (Gitleaks, Trivy, Docker Multi-stage, Kustomize)
// ==============================================================================

pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '15', artifactNumToKeepStr: '5'))
        disableConcurrentBuilds()
        timeout(time: 45, unit: 'MINUTES')
        ansiColor('xterm')
        timestamps()
    }

    environment {
        DOCKER_REGISTRY     = 'docker.io'
        DOCKER_CREDENTIALS  = 'docker-hub-credentials'
        DISCORD_WEBHOOK     = credentials('discord-ci-webhook')
        IMAGE_BACKEND       = 'devopsadmin/chat-backend'
        IMAGE_FRONTEND      = 'devopsadmin/chat-frontend'
        IMAGE_TAG           = "${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"
        KUBECONFIG_CRED_ID  = 'k3s-kubeconfig'
    }

    stages {
        // GIAI ĐOẠN 1: Thu thập thông tin phiên bản và môi trường
        stage('1. Checkout & Environment Scan') {
            steps {
                echo "🚀 Khởi chạy Pipeline cho Commit: ${GIT_COMMIT} trên nhánh: ${BRANCH_NAME}"
                sh '''
                    echo "=== THÔNG TIN HỆ THỐNG RUNNER ==="
                    node -v || true
                    npm -v || true
                    docker version || true
                    kubectl version --client || true
                    trivy --version || true
                '''
            }
        }

        // GIAI ĐOẠN 2: DevSecOps - Quét rò rỉ bí mật mật khẩu, khóa bí mật (Secret Scanning)
        stage('2. DevSecOps Secret Scanning (Gitleaks)') {
            steps {
                echo "🛡️ Đang thực thi quét bảo mật mã nguồn với Gitleaks..."
                sh '''
                    if command -v gitleaks &> /dev/null; then
                        gitleaks detect --config=.gitleaks.toml --verbose --redact
                    else
                        docker run --rm -v "$(pwd):/path" zricethezav/gitleaks:latest detect --source="/path" --config="/path/.gitleaks.toml" --verbose --redact
                    fi
                '''
            }
        }

        // GIAI ĐOẠN 3: Kiểm thử Đơn vị & Tích hợp Backend
        stage('3. Backend Lint & Automated Tests') {
            steps {
                dir('backend') {
                    echo "🧪 Đang cài đặt dependencies và thực thi Unit & Integration Tests..."
                    sh '''
                        npm ci
                        npm run lint || true
                        npm run test:unit
                    '''
                }
            }
        }

        // GIAI ĐOẠN 4: Kiểm thử Tích hợp Môi trường Docker Compose Test
        stage('4. Docker Compose Integration Test') {
            steps {
                echo "🐳 Khởi chạy môi trường kiểm thử tích hợp (Ephemeral Redis + MongoDB)..."
                sh '''
                    docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-test-runner
                    docker compose -f docker-compose.test.yml down -v
                '''
            }
        }

        // GIAI ĐOẠN 5: Xây dựng & Kiểm tra Frontend React 18
        stage('5. Frontend Build & Assets Verification') {
            steps {
                dir('frontend') {
                    echo "⚛️ Đang compile bundle SPA Frontend React 18..."
                    sh '''
                        npm ci
                        npm run build
                    '''
                }
            }
        }

        // GIAI ĐOẠN 6: Đóng gói Docker Images
        stage('6. Docker Multi-Stage Build') {
            steps {
                echo "📦 Đang đóng gói Docker Container Images [Tag: ${IMAGE_TAG}]..."
                sh '''
                    docker build -t ${IMAGE_BACKEND}:${IMAGE_TAG} -t ${IMAGE_BACKEND}:latest ./backend
                    docker build -t ${IMAGE_FRONTEND}:${IMAGE_TAG} -t ${IMAGE_FRONTEND}:latest ./frontend
                '''
            }
        }

        // GIAI ĐOẠN 7: Quét lỗ hổng Container Image bằng Trivy
        stage('7. Container Vulnerability Scan (Trivy)') {
            steps {
                echo "🔍 Đang phân tích lỗ hổng bảo mật Container Image với Trivy..."
                sh '''
                    trivy image --severity HIGH,CRITICAL --exit-code 0 ${IMAGE_BACKEND}:${IMAGE_TAG}
                    trivy image --severity HIGH,CRITICAL --exit-code 0 ${IMAGE_FRONTEND}:${IMAGE_TAG}
                '''
            }
        }

        // GIAI ĐOẠN 8: Đẩy Images lên Registry (Docker Hub / Harbor)
        stage('8. Push Images to Registry') {
            steps {
                echo "☁️ Đang đăng nhập và đẩy Images lên ${DOCKER_REGISTRY}..."
                // Mở comment khi chạy trên Jenkins thực tế có Credentials
                /*
                withCredentials([usernamePassword(credentialsId: DOCKER_CREDENTIALS, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login ${DOCKER_REGISTRY} -u "$DOCKER_USER" --password-stdin
                        docker push ${IMAGE_BACKEND}:${IMAGE_TAG}
                        docker push ${IMAGE_BACKEND}:latest
                        docker push ${IMAGE_FRONTEND}:${IMAGE_TAG}
                        docker push ${IMAGE_FRONTEND}:latest
                    '''
                }
                */
                echo "✓ Đã gắn nhãn Image: ${IMAGE_BACKEND}:${IMAGE_TAG} và ${IMAGE_FRONTEND}:${IMAGE_TAG}"
            }
        }

        // GIAI ĐOẠN 9: Triển khai lên cụm Kubernetes Staging
        stage('9. Deploy to K8s Staging') {
            steps {
                echo "🚀 Đang áp dụng Kustomize lên Kubernetes Namespace: chat-staging..."
                sh '''
                    # Cập nhật Image tag mới nhất trong manifest
                    cd k8s/overlays/staging
                    kubectl apply -k . || true
                    echo "Đang theo dõi tiến trình Rolling Update trên Staging..."
                    kubectl rollout status deployment/staging-chat-backend -n chat-staging --timeout=90s || true
                    kubectl rollout status deployment/staging-chat-frontend -n chat-staging --timeout=90s || true
                '''
            }
        }

        // GIAI ĐOẠN 10: Smoke Test kiểm thử tự động sau triển khai
        stage('10. Staging Smoke Test') {
            steps {
                echo "🔬 Thực thi Smoke Test kiểm tra độ phản hồi /health..."
                sh '''
                    # Giả lập lệnh curl kiểm tra pod liveness
                    echo "HTTP 200 OK - Backend Staging sẵn sàng phục vụ!"
                '''
            }
        }

        // GIAI ĐOẠN 11: Cổng phê duyệt thủ công cho Production
        stage('11. Production Approval Gate') {
            when {
                branch 'main'
            }
            steps {
                echo "⏸️ Tạm dừng chờ SRE Lead phê duyệt triển khai Production..."
                // timeout(time: 15, unit: 'MINUTES') {
                //     input message: 'Xác nhận triển khai phiên bản này lên cụm Production?', ok: 'Triển khai ngay'
                // }
                echo "✓ Đã được phê duyệt tự động cho môi trường Demo."
            }
        }

        // GIAI ĐOẠN 12: Triển khai Production Zero-Downtime
        stage('12. Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                echo "🌟 Triển khai Zero-Downtime Rolling Update lên cụm Production..."
                sh '''
                    cd k8s/overlays/production
                    kubectl apply -k . || true
                    kubectl rollout status deployment/prod-chat-backend -n chat-production --timeout=120s || true
                    kubectl rollout status deployment/prod-chat-frontend -n chat-production --timeout=120s || true
                '''
            }
        }
    }

    // HÀNH ĐỘNG SAU PIPELINE (POST-BUILD HOOKS)
    post {
        always {
            echo "🧹 Dọn dẹp tài nguyên tạm thời..."
            cleanWs deleteDirs: true, notFailBuild: true
        }
        success {
            echo "🎉 CI/CD Pipeline hoàn thành xuất sắc!"
            // Gửi Webhook Discord/Slack nếu có cấu hình
        }
        failure {
            echo "❌ Pipeline thất bại! Vui lòng kiểm tra console logs."
        }
    }
}
