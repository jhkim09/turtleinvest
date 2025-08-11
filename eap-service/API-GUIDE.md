# EAP Service API 가이드

## 📖 개요
이 문서는 EAP (Employee Assistance Program) 서비스의 REST API를 상세히 설명합니다.

## 🔐 인증
모든 보호된 엔드포인트는 JWT 토큰을 요구합니다.

### 헤더
```
Authorization: Bearer <token>
Content-Type: application/json
```

## 📋 API 엔드포인트

### 🔑 인증 (Authentication)

#### 회원가입
```http
POST /api/auth/register
```

**요청 본문:**
```json
{
  "name": "홍길동",
  "email": "hong@example.com",
  "password": "password123",
  "department": "IT개발팀",
  "employeeId": "EMP001",
  "companyId": "64abc123def456789",
  "role": "employee"
}
```

**응답:**
```json
{
  "message": "사용자가 성공적으로 등록되었습니다.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "64abc123def456789",
    "name": "홍길동",
    "email": "hong@example.com",
    "role": "employee",
    "department": "IT개발팀"
  }
}
```

#### 로그인
```http
POST /api/auth/login
```

**요청 본문:**
```json
{
  "email": "hong@example.com",
  "password": "password123"
}
```

---

### 👥 사용자 관리 (Users)

#### 상담사 목록 조회
```http
GET /api/users/counselors
```

**응답:**
```json
{
  "counselors": [
    {
      "_id": "64abc123def456789",
      "name": "김상담",
      "email": "counselor@example.com",
      "specialties": ["스트레스 관리", "직장 적응"],
      "bio": "10년 경력의 전문 상담사입니다.",
      "isActive": true,
      "availableSlots": [
        {
          "date": "2024-01-15",
          "time": "10:00",
          "available": true
        }
      ]
    }
  ]
}
```

---

### 🏢 회사 관리 (Companies)

#### 공개 회사 목록 (회원가입용)
```http
GET /api/companies/public
```

**응답:**
```json
{
  "companies": [
    {
      "_id": "64abc123def456789",
      "name": "테크 컴퍼니",
      "domain": "techcompany.com",
      "industry": "IT 소프트웨어"
    }
  ]
}
```

#### 회사별 부서 목록
```http
GET /api/companies/:id/departments
```

**응답:**
```json
{
  "departments": [
    "경영진",
    "IT개발팀",
    "마케팅팀",
    "영업팀",
    "인사팀",
    "재무팀"
  ]
}
```

#### 회사 정보 조회 (회사관리자용)
```http
GET /api/companies/my-company
```
**권한:** company-admin

**응답:**
```json
{
  "company": {
    "_id": "64abc123def456789",
    "name": "테크 컴퍼니",
    "domain": "techcompany.com",
    "industry": "IT 소프트웨어",
    "employeeCount": 45,
    "settings": {
      "departments": ["경영진", "IT개발팀", "마케팅팀"],
      "annualCounselingLimit": 12
    },
    "businessMetrics": {
      "annualRevenue": 1000000000,
      "avgEmployeeSalary": 50000000,
      "preEapTurnoverRate": 15
    }
  }
}
```

---

### 🎯 회사 관리자 (Company Admin)

#### 통계 조회
```http
GET /api/company-admin/stats
```
**권한:** company-admin

**응답:**
```json
{
  "totalEmployees": 45,
  "totalSessions": 128,
  "completedSessions": 98,
  "monthlyUsage": 32,
  "departmentUsage": {
    "IT개발팀": 15,
    "마케팅팀": 12,
    "영업팀": 8,
    "인사팀": 5,
    "재무팀": 3
  },
  "utilizationRate": 71
}
```

#### 직원 목록 조회
```http
GET /api/company-admin/employees
```
**권한:** company-admin

**응답:**
```json
[
  {
    "_id": "64abc123def456789",
    "name": "홍길동",
    "email": "hong@example.com",
    "department": "IT개발팀",
    "position": "직원",
    "role": "employee",
    "annualLimit": 12,
    "usedSessions": 3,
    "joinDate": "2024-01-15",
    "isActive": true
  }
]
```

#### 직원 등록
```http
POST /api/company-admin/employees
```
**권한:** company-admin

**요청 본문:**
```json
{
  "name": "신규직원",
  "email": "new@example.com",
  "department": "IT개발팀",
  "role": "employee",
  "annualLimit": 12
}
```

**응답:**
```json
{
  "message": "직원이 성공적으로 등록되었습니다.",
  "employee": {
    "_id": "64abc123def456789",
    "name": "신규직원",
    "email": "new@example.com",
    "department": "IT개발팀",
    "role": "employee",
    "annualLimit": 12,
    "usedSessions": 0,
    "joinDate": "2024-01-15",
    "isActive": true
  }
}
```

#### 부서 관리
```http
GET /api/company-admin/departments
```
**권한:** company-admin

**응답:**
```json
{
  "departments": ["경영진", "IT개발팀", "마케팅팀", "영업팀", "인사팀"]
}
```

```http
PUT /api/company-admin/departments
```
**권한:** company-admin

**요청 본문:**
```json
{
  "departments": ["경영진", "IT개발팀", "마케팅팀", "영업팀", "인사팀", "총무팀"]
}
```

#### 비즈니스 메트릭 관리
```http
GET /api/company-admin/business-metrics
```
**권한:** company-admin

**응답:**
```json
{
  "businessMetrics": {
    "annualRevenue": 1000000000,
    "avgEmployeeSalary": 50000000,
    "preEapAbsenteeismDays": 360,
    "preEapTurnoverRate": 15,
    "dailyProductivityPerEmployee": 200000,
    "recruitmentTrainingCost": 10000000
  }
}
```

```http
PUT /api/company-admin/business-metrics
```
**권한:** company-admin

**요청 본문:**
```json
{
  "businessMetrics": {
    "annualRevenue": 1200000000,
    "avgEmployeeSalary": 55000000,
    "preEapAbsenteeismDays": 400,
    "preEapTurnoverRate": 12,
    "dailyProductivityPerEmployee": 220000,
    "recruitmentTrainingCost": 12000000
  }
}
```

---

### 📊 리포트 생성

#### 월간 사용현황 보고서
```http
POST /api/company-admin/reports/monthly
```
**권한:** company-admin

**요청 본문:**
```json
{
  "year": 2024,
  "month": 1
}
```

**응답:**
```json
{
  "message": "월간 보고서가 생성되었습니다.",
  "report": {
    "period": "2024년 1월",
    "totalSessions": 32,
    "completedSessions": 28,
    "departmentStats": {
      "IT개발팀": {
        "totalSessions": 8,
        "completedSessions": 7,
        "employeeCount": 3
      },
      "마케팅팀": {
        "totalSessions": 6,
        "completedSessions": 5,
        "employeeCount": 2
      }
    },
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "reportType": "monthly"
  }
}
```

#### 만족도 조사 보고서
```http
POST /api/company-admin/reports/satisfaction
```
**권한:** company-admin

**요청 본문:**
```json
{
  "period": "분기별"
}
```

**응답:**
```json
{
  "message": "만족도 조사 보고서가 생성되었습니다.",
  "report": {
    "period": "분기별",
    "averageRating": 4.2,
    "responseRate": 75,
    "totalResponses": 89,
    "categoryRatings": {
      "상담사 전문성": 4.5,
      "상담 환경": 4.1,
      "예약 편의성": 3.9,
      "비밀보장": 4.6,
      "전반적 만족도": 4.2
    },
    "improvements": [
      "예약 시스템 개선 요청",
      "상담실 환경 개선",
      "다양한 상담 방식 제공"
    ],
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "reportType": "satisfaction"
  }
}
```

#### 비용 분석 보고서
```http
POST /api/company-admin/reports/cost
```
**권한:** company-admin

**요청 본문:**
```json
{
  "year": 2024
}
```

**응답:**
```json
{
  "message": "비용 분석 보고서가 생성되었습니다.",
  "report": {
    "year": 2024,
    "totalSessions": 128,
    "totalCost": 10240000,
    "avgSessionCost": 80000,
    "costPerEmployee": 227556,
    "currentEmployeeCount": 45,
    "monthlyCosts": {
      "1": { "month": 1, "sessions": 32, "cost": 2560000 },
      "2": { "month": 2, "sessions": 28, "cost": 2240000 }
    },
    "roi": {
      "absenteeismReduction": 64.0,
      "absenteeismSavings": 12800000,
      "turnoverReduction": 2.7,
      "turnoverSavings": 27000000,
      "productivityGain": 19200000,
      "medicalSavings": 8500000,
      "totalBenefits": 67500000,
      "roiPercentage": 659,
      "assumptions": {
        "absenteeismReductionPerSession": 0.5,
        "turnoverReductionRate": 20,
        "productivityImprovementRate": 3,
        "medicalCostSavingRate": 15
      }
    },
    "businessContext": {
      "employeeCount": 45,
      "avgSalary": 50000000,
      "dailyProductivity": 200000,
      "preEapMetrics": {
        "turnoverRate": 15,
        "absenteeismDays": 360
      }
    },
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "reportType": "cost"
  }
}
```

---

### 📅 상담 예약 (Counseling Sessions)

#### 예약 생성
```http
POST /api/counseling/sessions
```
**권한:** employee, manager

**요청 본문:**
```json
{
  "counselorId": "64abc123def456789",
  "appointmentDate": "2024-01-20T14:00:00.000Z",
  "sessionType": "individual",
  "issue": "work-stress",
  "urgency": "medium",
  "notes": "최근 업무 스트레스가 심해져서 상담을 받고 싶습니다."
}
```

**응답:**
```json
{
  "message": "상담 예약이 성공적으로 생성되었습니다.",
  "session": {
    "_id": "64abc123def456789",
    "employee": "64abc123def456789",
    "counselor": "64abc123def456789",
    "appointmentDate": "2024-01-20T14:00:00.000Z",
    "sessionType": "individual",
    "issue": "work-stress",
    "urgency": "medium",
    "status": "scheduled",
    "notes": "최근 업무 스트레스가 심해져서 상담을 받고 싶습니다."
  }
}
```

#### 예약 목록 조회
```http
GET /api/counseling/sessions
```
**권한:** employee, manager, counselor, company-admin

**쿼리 파라미터:**
- `status`: scheduled, completed, cancelled, no-show
- `counselorId`: 특정 상담사 필터링
- `startDate`: 시작 날짜 (YYYY-MM-DD)
- `endDate`: 종료 날짜 (YYYY-MM-DD)

**응답:**
```json
{
  "sessions": [
    {
      "_id": "64abc123def456789",
      "employee": {
        "_id": "64abc123def456789",
        "name": "홍길동",
        "department": "IT개발팀"
      },
      "counselor": {
        "_id": "64abc123def456789",
        "name": "김상담"
      },
      "appointmentDate": "2024-01-20T14:00:00.000Z",
      "sessionType": "individual",
      "issue": "work-stress",
      "status": "scheduled"
    }
  ]
}
```

---

## 🔒 권한 시스템

### 역할 정의
- **employee**: 일반 직원 - 상담 예약, 본인 기록 조회
- **manager**: 관리자 - 직원 권한 + 팀원 현황 조회
- **counselor**: 상담사 - 상담 기록 작성, 예약 관리
- **company-admin**: 회사관리자 - 회사 전체 관리, 통계 조회
- **super-admin**: 슈퍼관리자 - 시스템 전체 관리

### 접근 제어
각 API 엔드포인트는 필요한 권한을 명시하며, 인증된 사용자의 역할을 확인합니다.

---

## 📝 데이터 모델

### User 스키마
```javascript
{
  _id: ObjectId,
  name: String,           // 사용자 이름
  email: String,          // 이메일 (로그인 ID)
  password: String,       // 해시된 비밀번호
  role: String,           // employee, manager, counselor, company-admin, super-admin
  department: String,     // 부서명
  employeeId: String,     // 사원번호
  company: ObjectId,      // 소속 회사 ID
  isActive: Boolean,      // 계정 활성화 상태
  annualCounselingUsage: {
    year: Number,         // 연도
    used: Number,         // 사용한 상담 횟수
    limit: Number         // 연간 상담 한도
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Company 스키마
```javascript
{
  _id: ObjectId,
  name: String,           // 회사명
  domain: String,         // 회사 도메인
  industry: String,       // 업종
  settings: {
    departments: [String], // 부서 목록
    annualCounselingLimit: Number, // 기본 연간 상담 한도
    allowSelfRegistration: Boolean
  },
  businessMetrics: {
    annualRevenue: Number,           // 연간 매출
    avgEmployeeSalary: Number,       // 평균 직원 연봉
    preEapAbsenteeismDays: Number,   // EAP 도입 전 결근일수
    preEapTurnoverRate: Number,      // EAP 도입 전 이직률
    dailyProductivityPerEmployee: Number, // 일일 직원당 생산성
    recruitmentTrainingCost: Number   // 채용/교육 비용
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### CounselingSession 스키마
```javascript
{
  _id: ObjectId,
  employee: ObjectId,     // 직원 ID
  counselor: ObjectId,    // 상담사 ID
  company: ObjectId,      // 회사 ID
  appointmentDate: Date,  // 예약 일시
  sessionType: String,    // individual, group, family
  issue: String,          // work-stress, personal, family, etc.
  urgency: String,        // low, medium, high
  status: String,         // scheduled, completed, cancelled, no-show
  notes: String,          // 예약 시 메모
  sessionNotes: String,   // 상담 후 기록 (상담사 작성)
  recommendations: String, // 권장사항
  nextSessionDate: Date,  // 다음 상담 예정일
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚨 에러 처리

### 공통 에러 형식
```json
{
  "error": "에러 메시지",
  "errors": [
    {
      "field": "email",
      "message": "유효한 이메일을 입력하세요."
    }
  ]
}
```

### HTTP 상태 코드
- `200`: 성공
- `201`: 생성 성공
- `400`: 잘못된 요청
- `401`: 인증 실패
- `403`: 권한 부족
- `404`: 리소스 없음
- `409`: 충돌 (중복 데이터)
- `500`: 서버 에러

---

## 🔧 개발 환경 설정

### 환경변수
```env
# 데이터베이스
MONGODB_URI=mongodb://localhost:27017/eap-service

# JWT
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRES_IN=24h

# 서버
PORT=3000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000
```

### 테스트 실행
```bash
# 백엔드 테스트
cd backend && npm test

# 프론트엔드 테스트
cd frontend && npm test
```

---

## 📞 지원

API 관련 문의사항이나 버그 리포트는 GitHub Issues를 통해 제출해주세요.

**최근 업데이트:** 2024년 1월 - 회사관리자 리포트 시스템, 부서 관리, 비즈니스 메트릭 기능 추가