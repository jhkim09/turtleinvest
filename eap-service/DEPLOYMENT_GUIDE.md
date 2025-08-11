# EAP Service 배포 가이드

## AWS 배포 옵션

### 1️⃣ AWS EC2 + PM2 (추천)

#### EC2 인스턴스 설정
```bash
# Ubuntu 20.04 LTS 권장
sudo apt update
sudo apt install nodejs npm nginx git

# PM2 설치
sudo npm install -g pm2

# 프로젝트 클론
git clone <your-repo-url>
cd eap-service
```

#### 백엔드 배포
```bash
cd backend
npm install
pm2 start server.js --name "eap-backend"
pm2 startup
pm2 save
```

#### 프론트엔드 빌드 및 배포
```bash
cd frontend
npm install
npm run build

# Nginx로 서빙
sudo cp -r build/* /var/www/html/
```

#### Nginx 설정 (/etc/nginx/sites-available/default)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 프론트엔드
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    # 백엔드 API
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2️⃣ AWS Amplify + Lambda (서버리스)

#### 프론트엔드 (Amplify)
```bash
# AWS CLI 설치 후
amplify init
amplify add hosting
amplify publish
```

#### 백엔드 (Lambda + API Gateway)
- Express 앱을 Lambda 함수로 변환
- `serverless-express` 사용
- RDS 또는 DocumentDB 연결

### 3️⃣ Docker 컨테이너 배포

#### Dockerfile (백엔드)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5001
CMD ["npm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5001:5001"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/eap-service
    depends_on:
      - mongo
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
  
  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

## 환경 변수 설정

### backend/.env (프로덕션)
```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eap-service
JWT_SECRET=your-super-secure-jwt-secret-here
CORS_ORIGIN=https://your-domain.com
```

### frontend/.env (프로덕션)
```env
REACT_APP_API_URL=https://your-domain.com/api
```

## SSL 인증서 설정

### Let's Encrypt (무료)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 모니터링 설정

### PM2 모니터링
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 로그 확인
```bash
pm2 logs eap-backend
pm2 monit
```

## 백업 전략

### MongoDB Atlas 백업
- 자동 백업 활성화
- Point-in-time Recovery 설정

### 파일 백업
```bash
# 정기 백업 스크립트
#!/bin/bash
tar -czf backup-$(date +%Y%m%d).tar.gz eap-service/
aws s3 cp backup-$(date +%Y%m%d).tar.gz s3://your-backup-bucket/
```

## 성능 최적화

### 1. 프론트엔드
```bash
# 빌드 최적화
npm run build --max-old-space-size=8192

# 번들 분석
npm install --save-dev webpack-bundle-analyzer
npx webpack-bundle-analyzer build/static/js/*.js
```

### 2. 백엔드
```javascript
// 캐싱 미들웨어
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10분 캐시

app.get('/api/reports/dashboard', (req, res) => {
  const cacheKey = 'dashboard-data';
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    return res.json(cachedData);
  }
  
  // 데이터 조회 로직...
  cache.set(cacheKey, data);
  res.json(data);
});
```

## 보안 강화

### 1. Helmet.js 추가
```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 2. Rate Limiting
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 최대 100 요청
});

app.use('/api/', limiter);
```

## 도메인 및 DNS 설정

### Route 53 설정
1. 호스팅 영역 생성
2. A 레코드 추가 (EC2 IP)
3. CNAME 레코드 추가 (www 서브도메인)

## CI/CD 파이프라인

### GitHub Actions 예시
```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to EC2
      uses: appleboy/ssh-action@v0.1.4
      with:
        host: ${{ secrets.EC2_HOST }}
        username: ubuntu
        key: ${{ secrets.EC2_KEY }}
        script: |
          cd /home/ubuntu/eap-service
          git pull origin main
          cd backend && npm install && pm2 restart eap-backend
          cd ../frontend && npm install && npm run build
          sudo cp -r build/* /var/www/html/
```

## 비용 최적화

### AWS 무료 티어 활용
- **EC2**: t2.micro (1년 무료)
- **RDS**: db.t2.micro (1년 무료)
- **MongoDB Atlas**: 512MB 무료
- **Route 53**: $0.50/월 (호스팅 영역)

### 예상 월 비용 (무료 티어 후)
- EC2 t3.micro: ~$10/월
- 트래픽 비용: ~$5/월
- 총 예상 비용: **~$15-20/월**

---
**작성일**: 2025년 8월 9일  
**대상**: AWS 배포 환경  
**난이도**: 중급