# EAP Service - 근로자지원프로그램

Employee Assistance Program (EAP) 웹서비스 - 직원들의 정신건강과 복지를 지원하는 통합 플랫폼

## 🚀 주요 기능

### 사용자 관리
- **다중 역할 지원**: 직원(employee), 관리자(manager), 상담사(counselor), 회사관리자(company-admin), 슈퍼관리자(super-admin)
- **회사별 관리**: 회사 단위로 직원 및 데이터 분리 관리
- **부서 표준화**: 회사별 부서 목록 관리로 일관된 데이터 입력
- **스마트 등록**: 중복 가입 방지 및 기존 사용자 연동
- **보안 인증**: JWT 기반 인증 시스템
- **권한별 접근 제어**: 세분화된 역할별 페이지 및 기능 접근 관리

### 상담 예약 시스템
- **온라인 예약**: 직원이 상담사별로 상담 예약 가능
- **예약 관리**: 예약 상태 변경 (scheduled, completed, cancelled, no-show)
- **충돌 방지**: 동일 시간대 중복 예약 방지

### 상담 기록 관리
- **상세 기록**: 상담 내용, 주요 이슈, 권장사항 기록
- **위험도 평가**: low, medium, high 3단계 위험 수준 관리
- **후속 관리**: 추가 상담 필요 여부 및 일정 관리

### 회사 관리자 대시보드
- **실시간 통계**: 직원 수, 상담 완료 현황, 서비스 이용률 등
- **부서별 분석**: 부서별 웰빙 케어 현황 통계 (시각적 차트)
- **직원 관리**: 직원 등록, 연간 상담 한도 설정, 부서 관리
- **비즈니스 설정**: ROI 계산을 위한 회사 비즈니스 메트릭 관리
- **따뜻한 UI/UX**: EAP 서비스에 맞는 케어 중심의 디자인

### 리포트 생성
- **월간 사용현황 보고서**: 부서별 상담 이용 통계 및 완료율
- **만족도 조사 보고서**: 상담 서비스 만족도 및 개선점 분석
- **비용 분석 보고서**: ROI 계산, 절약 효과, 투자 대비 수익률
- **시각적 데이터**: 차트와 그래프를 통한 데이터 시각화
- **실시간 생성**: 선택한 기간에 대한 즉시 보고서 생성

### 모바일 반응형
- **Tailwind CSS**: 모든 기기에서 최적화된 UI/UX
- **터치 친화적**: 모바일 환경에 최적화된 인터페이스

## 🛠 기술 스택

### Backend
- **Node.js + Express**: RESTful API 서버
- **MongoDB + Mongoose**: NoSQL 데이터베이스
- **JWT**: 인증 및 권한 관리
- **bcryptjs**: 패스워드 해싱
- **express-validator**: 입력값 검증

### Frontend
- **React 18 + TypeScript**: 타입 안전한 프론트엔드
- **React Router**: SPA 라우팅
- **Axios**: HTTP 클라이언트
- **인라인 스타일링**: 컴포넌트 기반 스타일링
- **반응형 디자인**: 모바일 최적화 UI
- **EAP 전용 UI/UX**: 웰빙 케어 중심의 따뜻한 디자인

## 📁 프로젝트 구조

```
eap-service/
├── backend/                 # Node.js API 서버
│   ├── models/             # MongoDB 스키마
│   │   ├── User.js        # 사용자 모델 (다중 역할 지원)
│   │   ├── Company.js     # 회사 모델 (부서, 비즈니스 메트릭)
│   │   └── CounselingSession.js # 상담 세션 모델
│   ├── routes/             # API 라우트
│   │   ├── auth.js        # 인증 관련
│   │   ├── users.js       # 사용자 관리
│   │   ├── companies.js   # 회사 관리
│   │   ├── company-admin.js # 회사관리자 전용
│   │   └── counseling.js  # 상담 관련
│   ├── middleware/         # 미들웨어
│   │   └── auth.js        # JWT 인증 및 권한 검사
│   └── server.js          # 서버 진입점
├── frontend/               # React 웹앱
│   ├── src/
│   │   ├── components/    # 재사용 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   │   ├── CompanyAdminDashboard.tsx # 회사관리자 대시보드
│   │   │   ├── Login.tsx  # 로그인
│   │   │   └── Register.tsx # 회원가입
│   │   ├── hooks/         # 커스텀 훅
│   │   ├── services/      # API 서비스
│   │   └── types/         # TypeScript 타입
│   └── public/
├── API-GUIDE.md            # 상세 API 가이드
└── README.md              # 프로젝트 개요
```

## 🚦 설치 및 실행

### 사전 요구사항
- Node.js 16+ 
- MongoDB 4.4+
- npm 또는 yarn

### 1. 저장소 클론 및 의존성 설치
```bash
# 전체 의존성 설치
npm run install:all
```

### 2. 환경변수 설정
```bash
# backend 환경변수
cp backend/.env.example backend/.env
```

`.env` 파일을 편집하여 MongoDB URI 및 JWT secret 설정:
```env
MONGODB_URI=mongodb://localhost:27017/eap-service
JWT_SECRET=your_secure_jwt_secret_here
PORT=5000
```

### 3. 개발 서버 실행
```bash
# 프론트엔드와 백엔드 동시 실행
npm run dev

# 또는 개별 실행
npm run backend:dev    # 백엔드만
npm run frontend:dev   # 프론트엔드만
```

### 4. 접속
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:5000
- API 상태 확인: http://localhost:5000/api/health

## 📋 주요 API 엔드포인트

> 📖 **상세한 API 가이드는 [API-GUIDE.md](./API-GUIDE.md)를 참조하세요.**

### 🔑 인증 (Authentication)
- `POST /api/auth/register` - 사용자 등록 (회사별 부서 선택)
- `POST /api/auth/login` - 로그인

### 🏢 회사 관리 (Companies)
- `GET /api/companies/public` - 공개 회사 목록 (회원가입용)
- `GET /api/companies/:id/departments` - 회사별 부서 목록
- `GET /api/companies/my-company` - 내 회사 정보 조회

### 👥 회사 관리자 (Company Admin)
- `GET /api/company-admin/stats` - 회사 통계 조회
- `GET /api/company-admin/employees` - 직원 목록 조회
- `POST /api/company-admin/employees` - 직원 등록
- `GET/PUT /api/company-admin/departments` - 부서 관리
- `GET/PUT /api/company-admin/business-metrics` - 비즈니스 메트릭 관리

### 📊 리포트 생성
- `POST /api/company-admin/reports/monthly` - 월간 사용현황 보고서
- `POST /api/company-admin/reports/satisfaction` - 만족도 조사 보고서
- `POST /api/company-admin/reports/cost` - 비용 분석 및 ROI 보고서

### 📅 상담 관리 (Counseling)
- `GET /api/counseling/sessions` - 상담 세션 목록
- `POST /api/counseling/sessions` - 상담 예약 생성
- `PUT /api/counseling/sessions/:id` - 상담 상태 변경

## 🔐 보안 특징

- **패스워드 해싱**: bcrypt를 사용한 안전한 패스워드 저장
- **JWT 토큰**: stateless 인증으로 확장성 확보
- **입력값 검증**: express-validator로 모든 입력값 검증
- **세분화된 권한 제어**: 5단계 역할별 API 접근 제한
- **회사별 데이터 격리**: 회사 단위로 데이터 접근 제한
- **CORS 설정**: 허용된 도메인에서만 API 접근 가능
- **민감정보 보호**: 상담 내용 및 개인정보 암호화 저장

## 📊 주요 데이터 모델

> 📖 **상세한 스키마는 [API-GUIDE.md](./API-GUIDE.md#데이터-모델)를 참조하세요.**

### 사용자 (User)
- 기본 정보 (이름, 이메일, 다중 역할)
- 소속 회사 및 부서 정보
- 연간 상담 한도 및 사용량
- 계정 상태 (활성/비활성)

### 회사 (Company)
- 회사 기본 정보 (명칭, 업종, 도메인)
- 부서 목록 및 설정
- 비즈니스 메트릭 (매출, 평균연봉, 이직률 등)
- 서비스 설정 (연간 상담 한도 등)

### 상담 세션 (CounselingSession)
- 직원-상담사 매핑
- 일정 정보 (날짜, 시간, 유형)
- 상담 주제 및 긴급도
- 예약 상태 및 세션 기록

### 리포트 데이터
- 월간/분기별 사용 현황
- 만족도 조사 결과
- ROI 및 비용 효과 분석

## 🎯 향후 개발 계획

### 🔜 단기 계획
- [ ] 상담사 관리 시스템 완성
- [ ] 직원용 대시보드 개발
- [ ] 상담 예약 및 일정 관리 시스템
- [ ] 이메일 알림 시스템

### 🚀 중장기 계획
- [ ] 실시간 채팅 상담 기능
- [ ] SMS 알림 통합
- [ ] 심리검사 도구 통합
- [ ] 스트레스 관리 콘텐츠 라이브러리
- [ ] 다국어 지원 (English, 中文)
- [ ] 모바일 앱 개발 (React Native)
- [ ] 고급 분석 및 AI 추천 시스템

## 🤝 기여하기

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 생성해주세요.