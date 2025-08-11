# EAP Service AWS 배포 가이드

## 🚀 배포 방식 선택

### Option 1: AWS EC2 + MongoDB Atlas (권장)
- **비용**: 낮음-중간
- **관리 복잡도**: 낮음
- **확장성**: 중간

### Option 2: AWS ECS + DocumentDB 
- **비용**: 중간-높음
- **관리 복잡도**: 중간
- **확장성**: 높음

### Option 3: AWS Lambda + DynamoDB
- **비용**: 낮음 (트래픽 기반)
- **관리 복잡도**: 높음
- **확장성**: 매우 높음

---

## 📋 사전 준비사항

### 1. AWS 계정 설정
```bash
# AWS CLI 설치 및 구성
aws configure
# Access Key ID, Secret Access Key, Region(ap-northeast-2) 설정
```

### 2. MongoDB Atlas 설정 (Option 1 선택시)
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 가입
2. 무료 클러스터 생성 (M0 Sandbox)
3. 데이터베이스 사용자 생성
4. Network Access에서 AWS EC2 IP 허용 (또는 0.0.0.0/0)
5. 연결 문자열 복사

---

## 🔧 Option 1: EC2 + MongoDB Atlas 배포

### Step 1: EC2 인스턴스 생성

```bash
# 1. EC2 인스턴스 시작
# - AMI: Amazon Linux 2 AMI
# - Instance Type: t3.micro (프리티어) 또는 t3.small
# - Security Group: HTTP(80), HTTPS(443), SSH(22), Custom TCP(3000)

# 2. 인스턴스 연결
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### Step 2: 서버 환경 설정

```bash
# Node.js 설치
sudo yum update -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Git 설치
sudo yum install git -y

# PM2 설치 (프로세스 관리자)
npm install -g pm2

# Docker 설치 (선택사항)
sudo yum install -y docker
sudo systemctl start docker
sudo usermod -a -G docker ec2-user
```

### Step 3: 애플리케이션 배포

```bash
# 1. 코드 클론
git clone https://github.com/your-repo/eap-service.git
cd eap-service

# 2. 의존성 설치
npm run install:all

# 3. 환경변수 설정
cp .env.production .env
nano .env

# MongoDB Atlas 연결 문자열 수정
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/eap-service?retryWrites=true&w=majority
JWT_SECRET=your_super_secure_jwt_secret
FRONTEND_URL=http://your-ec2-ip:3000
```

### Step 4: 빌드 및 실행

```bash
# 1. 프론트엔드 빌드
npm run build

# 2. PM2로 애플리케이션 실행
cd backend
pm2 start ecosystem.config.js

# 3. PM2 설정
pm2 startup
pm2 save
```

### Step 5: Nginx 설정 (선택사항)

```bash
# Nginx 설치
sudo amazon-linux-extras install nginx1 -y

# 설정 파일 생성
sudo nano /etc/nginx/conf.d/eap-service.conf
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 도메인이 있는 경우

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Nginx 시작
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 🐳 Option 2: Docker 컨테이너 배포

### Step 1: Docker 이미지 빌드

```bash
# 로컬에서 빌드
docker build -t eap-service .

# AWS ECR에 푸시
aws ecr create-repository --repository-name eap-service
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin your-account-id.dkr.ecr.ap-northeast-2.amazonaws.com
docker tag eap-service:latest your-account-id.dkr.ecr.ap-northeast-2.amazonaws.com/eap-service:latest
docker push your-account-id.dkr.ecr.ap-northeast-2.amazonaws.com/eap-service:latest
```

### Step 2: ECS 클러스터 생성

```bash
# ECS 클러스터 생성
aws ecs create-cluster --cluster-name eap-service-cluster

# 태스크 정의 등록
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

---

## 🔒 보안 설정

### 1. 환경변수 관리
- AWS Systems Manager Parameter Store 사용
- 또는 AWS Secrets Manager 사용

```bash
# Parameter Store에 비밀 정보 저장
aws ssm put-parameter --name "/eap-service/jwt-secret" --value "your-jwt-secret" --type "SecureString"
aws ssm put-parameter --name "/eap-service/mongodb-uri" --value "your-mongodb-uri" --type "SecureString"
```

### 2. Security Group 설정
- 포트 3000: 애플리케이션 접근
- 포트 22: SSH 접근 (본인 IP만)
- 포트 80/443: HTTP/HTTPS (Nginx 사용시)

### 3. IAM 역할 설정
- EC2 인스턴스에 필요한 최소 권한만 부여
- CloudWatch Logs 액세스
- Systems Manager 액세스 (환경변수 조회용)

---

## 📊 모니터링 설정

### CloudWatch 설정
```bash
# CloudWatch 에이전트 설치
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# 설정 파일 생성
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

### PM2 Monitoring
```bash
# PM2 모니터링 설정
pm2 install pm2-logrotate
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:max_size 10M
```

---

## 🚦 배포 체크리스트

### 배포 전 확인사항
- [ ] 환경변수 설정 완료 (.env.production)
- [ ] MongoDB Atlas 연결 테스트
- [ ] 프론트엔드 빌드 성공 확인
- [ ] Docker 이미지 빌드 성공 (Docker 사용시)
- [ ] AWS 계정 및 권한 설정
- [ ] 도메인 설정 (선택사항)

### 배포 후 확인사항
- [ ] 애플리케이션 정상 실행 확인
- [ ] Health Check API 응답 확인 (`/api/health`)
- [ ] 데이터베이스 연결 확인
- [ ] 프론트엔드 페이지 로드 확인
- [ ] 로그인/회원가입 기능 테스트
- [ ] 모니터링 설정 확인

---

## 🛠 유용한 명령어

### 서버 관리
```bash
# PM2 프로세스 확인
pm2 list
pm2 status

# 로그 확인
pm2 logs
pm2 logs --lines 100

# 프로세스 재시작
pm2 restart all
pm2 reload all

# 서버 리소스 확인
htop
df -h
free -m
```

### 데이터베이스 백업
```bash
# MongoDB Atlas 백업 (자동 백업 활성화 권장)
mongodump --uri="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/eap-service"
```

### SSL 인증서 설정 (Let's Encrypt)
```bash
# Certbot 설치
sudo yum install certbot python3-certbot-nginx -y

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com
```

---

## 💰 예상 비용 (월간)

### Option 1: EC2 + MongoDB Atlas
- EC2 t3.micro (프리티어): $0
- MongoDB Atlas M0 (프리티어): $0
- 데이터 전송: ~$1-5
- **총합**: ~$1-5/월

### Option 2: ECS + DocumentDB
- ECS Fargate: ~$20-50
- DocumentDB: ~$200+
- Load Balancer: ~$20
- **총합**: ~$240+/월

---

## 🆘 트러블슈팅

### 일반적인 문제
1. **포트 3000 접근 불가**
   - Security Group에서 포트 3000 허용 확인
   - EC2 인스턴스 방화벽 확인

2. **MongoDB 연결 실패**
   - Atlas Network Access에서 IP 허용 확인
   - 연결 문자열 정확성 확인

3. **메모리 부족**
   - 인스턴스 타입 업그레이드
   - PM2 클러스터 모드 사용

4. **빌드 실패**
   - Node.js 버전 확인
   - 의존성 설치 확인

---

## 📞 지원

배포 중 문제가 발생하면:
1. 로그 확인: `pm2 logs`
2. Health Check: `curl http://localhost:3000/api/health`
3. 시스템 리소스: `htop`, `df -h`

**연락처**: AWS 배포 관련 문의는 이슈로 등록해주세요.