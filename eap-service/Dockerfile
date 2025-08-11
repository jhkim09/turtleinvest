# 멀티스테이지 빌드로 프론트엔드와 백엔드를 모두 포함

# Frontend Build Stage
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

# 프론트엔드 의존성 설치
COPY frontend/package*.json ./
RUN npm ci --only=production

# 프론트엔드 소스 복사 및 빌드
COPY frontend/ ./
RUN npm run build

# Backend Stage  
FROM node:18-alpine AS backend
WORKDIR /app

# 시스템 패키지 업데이트 및 필요 패키지 설치
RUN apk update && apk add --no-cache dumb-init

# 백엔드 의존성 설치
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 백엔드 소스 복사
COPY backend/ ./

# 프론트엔드 빌드 파일 복사 (정적 파일로 서빙)
COPY --from=frontend-build /app/frontend/build ./public

# 비특권 사용자로 실행
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# 포트 노출
EXPOSE 3000

# 환경변수
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# 애플리케이션 실행
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]