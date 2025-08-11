# EAP Service API 사용 매뉴얼

## 📋 API 개요

### Base URL
- **개발**: `http://localhost:5001/api`
- **프로덕션**: `https://your-domain.com/api`

### 인증 방식
- **JWT Token** 사용
- Header: `Authorization: Bearer <token>`

---

## 🔐 인증 API

### 1. 회원가입
```http
POST /api/auth/register
Content-Type: application/json
```

**요청 Body:**
```json
{
  "email": "user@example.com",
  "password": "123456",
  "name": "사용자이름",
  "role": "employee",
  "department": "IT팀",
  "employeeId": "EMP001"
}
```

**응답 (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f1234567890abcdef12345",
    "email": "user@example.com",
    "name": "사용자이름",
    "role": "employee"
  }
}
```

### 2. 로그인
```http
POST /api/auth/login
Content-Type: application/json
```

**요청 Body:**
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**응답 (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f1234567890abcdef12345",
    "email": "user@example.com",
    "name": "사용자이름",
    "role": "employee"
  }
}
```

---

## 👥 사용자 관리 API

### 1. 내 프로필 조회
```http
GET /api/users/profile
Authorization: Bearer <token>
```

**응답 (200):**
```json
{
  "id": "64f1234567890abcdef12345",
  "email": "user@example.com",
  "name": "사용자이름",
  "role": "employee",
  "department": "IT팀",
  "employeeId": "EMP001",
  "isActive": true,
  "createdAt": "2025-08-09T12:00:00.000Z"
}
```

### 2. 프로필 수정
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 Body:**
```json
{
  "name": "새로운이름",
  "department": "마케팅팀"
}
```

### 3. 상담사 목록 조회
```http
GET /api/users/counselors
Authorization: Bearer <token>
```

**응답 (200):**
```json
[
  {
    "id": "64f1234567890abcdef12346",
    "name": "김상담사",
    "email": "counselor@example.com"
  },
  {
    "id": "64f1234567890abcdef12347",
    "name": "박상담사",
    "email": "counselor2@example.com"
  }
]
```

### 4. 전체 사용자 목록 (관리자만)
```http
GET /api/users?role=employee&page=1&limit=10
Authorization: Bearer <token>
```

**쿼리 파라미터:**
- `role`: employee, counselor, admin
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10)

**응답 (200):**
```json
{
  "users": [...],
  "totalPages": 5,
  "currentPage": 1,
  "total": 45
}
```

---

## 📅 예약 관리 API

### 1. 예약 목록 조회
```http
GET /api/appointments
Authorization: Bearer <token>
```

**응답 (200):**
```json
[
  {
    "_id": "64f1234567890abcdef12348",
    "employee": {
      "name": "김직원",
      "email": "employee@example.com",
      "employeeId": "EMP001",
      "department": "IT팀"
    },
    "counselor": {
      "name": "박상담사",
      "email": "counselor@example.com"
    },
    "scheduledDate": "2025-08-15T10:00:00.000Z",
    "duration": 60,
    "type": "individual",
    "status": "scheduled",
    "reason": "업무 스트레스 상담",
    "notes": "첫 상담입니다",
    "createdAt": "2025-08-09T12:00:00.000Z"
  }
]
```

### 2. 새 예약 생성 (직원만)
```http
POST /api/appointments
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 Body:**
```json
{
  "counselorId": "64f1234567890abcdef12346",
  "scheduledDate": "2025-08-15T10:00:00.000Z",
  "duration": 60,
  "type": "individual",
  "reason": "업무 스트레스로 인한 상담 요청",
  "notes": "처음 상담받아봅니다"
}
```

**응답 (201):**
```json
{
  "_id": "64f1234567890abcdef12348",
  "employee": "64f1234567890abcdef12345",
  "counselor": {
    "name": "박상담사",
    "email": "counselor@example.com"
  },
  "scheduledDate": "2025-08-15T10:00:00.000Z",
  "duration": 60,
  "type": "individual",
  "status": "scheduled",
  "reason": "업무 스트레스로 인한 상담 요청"
}
```

### 3. 예약 상태 변경 (상담사/관리자만)
```http
PUT /api/appointments/{appointmentId}/status
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 Body:**
```json
{
  "status": "completed"
}
```

**가능한 상태:**
- `scheduled`: 예약됨
- `completed`: 완료됨
- `cancelled`: 취소됨
- `no-show`: 노쇼

---

## 📝 상담 기록 API

### 1. 상담 기록 목록 조회
```http
GET /api/counseling/records
Authorization: Bearer <token>
```

**응답 (200):**
```json
[
  {
    "_id": "64f1234567890abcdef12349",
    "appointment": {
      "scheduledDate": "2025-08-15T10:00:00.000Z"
    },
    "employee": {
      "name": "김직원",
      "employeeId": "EMP001",
      "department": "IT팀"
    },
    "counselor": {
      "name": "박상담사"
    },
    "sessionDate": "2025-08-15T10:00:00.000Z",
    "sessionType": "individual",
    "mainIssues": ["stress", "work-life-balance"],
    "sessionNotes": "직원이 업무 과부하로 인한 스트레스를 호소함...",
    "recommendations": "규칙적인 휴식과 업무 우선순위 정리 권장",
    "followUpRequired": true,
    "nextAppointmentDate": "2025-08-22T10:00:00.000Z",
    "riskLevel": "medium",
    "createdAt": "2025-08-15T11:00:00.000Z"
  }
]
```

### 2. 상담 기록 생성 (상담사만)
```http
POST /api/counseling/records
Authorization: Bearer <token>
Content-Type: application/json
```

**요청 Body:**
```json
{
  "appointmentId": "64f1234567890abcdef12348",
  "sessionDate": "2025-08-15T10:00:00.000Z",
  "sessionType": "individual",
  "mainIssues": ["stress", "anxiety"],
  "sessionNotes": "직원이 최근 업무량 증가로 인한 스트레스를 호소하였음. 수면 패턴이 불규칙하며...",
  "recommendations": "1. 규칙적인 운동 권장\n2. 스트레스 관리 기법 학습\n3. 상사와의 업무량 조정 상담",
  "followUpRequired": true,
  "nextAppointmentDate": "2025-08-22T10:00:00.000Z",
  "riskLevel": "medium"
}
```

**주요 이슈 옵션:**
- `stress`: 스트레스
- `anxiety`: 불안
- `depression`: 우울
- `workplace-conflict`: 직장 갈등
- `work-life-balance`: 워라밸
- `other`: 기타

**위험도 옵션:**
- `low`: 낮음
- `medium`: 보통
- `high`: 높음

### 3. 특정 상담 기록 조회
```http
GET /api/counseling/records/{recordId}
Authorization: Bearer <token>
```

---

## 📊 리포트 및 통계 API

### 1. 대시보드 통계 (관리자/상담사만)
```http
GET /api/reports/dashboard?startDate=2025-08-01&endDate=2025-08-31
Authorization: Bearer <token>
```

**쿼리 파라미터:**
- `startDate`: 시작 날짜 (YYYY-MM-DD)
- `endDate`: 종료 날짜 (YYYY-MM-DD)

**응답 (200):**
```json
{
  "summary": {
    "totalAppointments": 150,
    "completedAppointments": 120,
    "cancelledAppointments": 15,
    "completionRate": 80
  },
  "departmentStats": [
    {
      "_id": "IT팀",
      "count": 45
    },
    {
      "_id": "마케팅팀",
      "count": 30
    }
  ],
  "monthlyTrend": [
    {
      "_id": {
        "year": 2025,
        "month": 8
      },
      "appointments": 75,
      "completed": 60
    }
  ],
  "issueStats": [
    {
      "_id": "stress",
      "count": 68
    },
    {
      "_id": "work-life-balance",
      "count": 35
    }
  ]
}
```

### 2. 상담사 성과 분석 (관리자만)
```http
GET /api/reports/counselor-performance?startDate=2025-08-01&endDate=2025-08-31
Authorization: Bearer <token>
```

**응답 (200):**
```json
[
  {
    "_id": "64f1234567890abcdef12346",
    "counselorName": "박상담사",
    "totalAppointments": 45,
    "completedAppointments": 40,
    "cancelledAppointments": 3,
    "completionRate": 88.89
  }
]
```

### 3. 데이터 내보내기 (관리자만)
```http
GET /api/reports/export/appointments?startDate=2025-08-01&endDate=2025-08-31&format=csv
Authorization: Bearer <token>
```

**쿼리 파라미터:**
- `format`: `json` 또는 `csv`
- `startDate`, `endDate`: 날짜 범위

**CSV 응답:**
```csv
예약일시,직원명,직원번호,부서,상담사,상태,유형,사유
2025-08-15T10:00:00.000Z,김직원,EMP001,IT팀,박상담사,completed,individual,업무 스트레스
```

---

## 🚨 에러 코드

### 일반적인 HTTP 상태 코드
- **200**: 성공
- **201**: 생성 성공
- **400**: 잘못된 요청
- **401**: 인증 실패
- **403**: 권한 없음
- **404**: 리소스 없음
- **500**: 서버 오류

### 에러 응답 형식
```json
{
  "message": "에러 메시지",
  "errors": [
    {
      "field": "email",
      "message": "유효한 이메일을 입력해주세요"
    }
  ]
}
```

---

## 📝 사용 예시

### JavaScript/Axios 예시
```javascript
// 1. 로그인
const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
  email: 'user@example.com',
  password: '123456'
});

const token = loginResponse.data.token;

// 2. 인증이 필요한 API 호출
const config = {
  headers: { Authorization: `Bearer ${token}` }
};

// 3. 예약 목록 조회
const appointments = await axios.get('http://localhost:5001/api/appointments', config);

// 4. 새 예약 생성
const newAppointment = await axios.post('http://localhost:5001/api/appointments', {
  counselorId: '64f1234567890abcdef12346',
  scheduledDate: '2025-08-15T10:00:00.000Z',
  reason: '업무 스트레스 상담'
}, config);
```

### cURL 예시
```bash
# 1. 로그인
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456"}'

# 2. 예약 목록 조회 (토큰 교체 필요)
curl -X GET http://localhost:5001/api/appointments \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. 새 예약 생성
curl -X POST http://localhost:5001/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"counselorId":"64f1234567890abcdef12346","scheduledDate":"2025-08-15T10:00:00.000Z","reason":"업무 스트레스 상담"}'
```

---

## 🔧 개발 팁

### 1. 토큰 관리
```javascript
// 로컬스토리지에 토큰 저장
localStorage.setItem('token', token);

// API 요청 시 자동으로 토큰 추가
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 2. 에러 처리
```javascript
try {
  const response = await axios.post('/api/appointments', appointmentData);
  console.log('예약 생성 성공:', response.data);
} catch (error) {
  if (error.response?.status === 401) {
    // 토큰 만료 - 재로그인 필요
    window.location.href = '/login';
  } else {
    console.error('API 오류:', error.response?.data?.message);
  }
}
```

### 3. 날짜 형식
```javascript
// ISO 8601 형식 사용
const date = new Date();
const isoString = date.toISOString(); // "2025-08-15T10:00:00.000Z"
```

---

**작성일**: 2025년 8월 9일  
**버전**: v1.0.0  
**업데이트**: API 변경 시 이 문서도 함께 업데이트해주세요