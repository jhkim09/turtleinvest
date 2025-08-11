module.exports = {
  apps: [{
    name: 'eap-service',
    script: 'server.js',
    
    // 환경 설정
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // PM2 클러스터 모드 설정
    instances: 1, // 또는 'max'로 CPU 코어 수만큼
    exec_mode: 'cluster',
    
    // 자동 재시작 설정
    watch: false, // 프로덕션에서는 false
    ignore_watch: ['node_modules', 'logs'],
    
    // 메모리 관리
    max_memory_restart: '500M',
    
    // 로그 설정
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_file: './logs/combined.log',
    time: true,
    
    // 재시작 정책
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // 헬스체크
    health_check_grace_period: 10000,
    
    // 기타 설정
    merge_logs: true,
    autorestart: true,
    
    // 환경변수 파일 로드
    env_file: '.env'
  }],

  // 배포 설정 (선택사항)
  deploy: {
    production: {
      user: 'ec2-user',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/your-repo/eap-service.git',
      path: '/home/ec2-user/eap-service',
      'pre-deploy-local': '',
      'post-deploy': 'npm run install:all && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};