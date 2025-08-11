#!/bin/bash

# EAP Service 배포 스크립트
# 사용법: ./deploy.sh [환경]
# 예시: ./deploy.sh production

set -e  # 오류 시 스크립트 중단

ENVIRONMENT=${1:-production}
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 EAP Service 배포 시작 (환경: $ENVIRONMENT)${NC}"

# 1. 환경변수 확인
echo -e "${YELLOW}📋 환경변수 파일 확인 중...${NC}"
if [ ! -f ".env.${ENVIRONMENT}" ]; then
    echo -e "${RED}❌ .env.${ENVIRONMENT} 파일이 없습니다!${NC}"
    exit 1
fi

# 2. 의존성 설치
echo -e "${YELLOW}📦 의존성 설치 중...${NC}"
npm run install:all

# 3. 프론트엔드 빌드
echo -e "${YELLOW}🏗️ 프론트엔드 빌드 중...${NC}"
npm run frontend:build

# 4. 정적 파일 복사
echo -e "${YELLOW}📁 정적 파일 복사 중...${NC}"
if [ -d "frontend/build" ]; then
    rm -rf backend/public
    cp -r frontend/build backend/public
    echo -e "${GREEN}✅ 정적 파일 복사 완료${NC}"
else
    echo -e "${RED}❌ 프론트엔드 빌드 파일이 없습니다!${NC}"
    exit 1
fi

# 5. 백엔드 로그 디렉토리 생성
mkdir -p backend/logs

# 6. PM2 배포 (로컬에서 실행하는 경우)
if [ "$ENVIRONMENT" = "local" ]; then
    echo -e "${YELLOW}🔄 PM2로 로컬 실행 중...${NC}"
    cd backend
    cp "../.env.${ENVIRONMENT}" .env
    pm2 start ecosystem.config.js --env $ENVIRONMENT
    pm2 save
    echo -e "${GREEN}✅ 로컬 배포 완료!${NC}"
    echo -e "${GREEN}🌍 애플리케이션 접속: http://localhost:3000${NC}"
    echo -e "${GREEN}📊 Health Check: http://localhost:3000/api/health${NC}"
fi

# 7. Docker 배포 (Docker 환경인 경우)
if [ "$ENVIRONMENT" = "docker" ]; then
    echo -e "${YELLOW}🐳 Docker 이미지 빌드 중...${NC}"
    docker build -t eap-service:latest .
    
    echo -e "${YELLOW}🚀 Docker 컨테이너 실행 중...${NC}"
    docker-compose down
    docker-compose up -d
    
    echo -e "${GREEN}✅ Docker 배포 완료!${NC}"
    echo -e "${GREEN}🌍 애플리케이션 접속: http://localhost:3000${NC}"
    echo -e "${GREEN}📊 MongoDB Admin: http://localhost:8081 (admin/admin123)${NC}"
fi

# 8. 배포 후 확인
echo -e "${YELLOW}🔍 배포 상태 확인 중...${NC}"
sleep 3

if [ "$ENVIRONMENT" != "production" ]; then
    # Health check
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health Check 통과${NC}"
    else
        echo -e "${RED}❌ Health Check 실패${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}🎉 배포 완료!${NC}"
echo -e "${YELLOW}📋 유용한 명령어:${NC}"
echo -e "   pm2 status       - PM2 프로세스 상태"
echo -e "   pm2 logs         - 애플리케이션 로그"
echo -e "   pm2 restart all  - 애플리케이션 재시작"

if [ "$ENVIRONMENT" = "docker" ]; then
    echo -e "   docker-compose logs -f  - Docker 로그 확인"
    echo -e "   docker-compose ps       - 컨테이너 상태"
fi