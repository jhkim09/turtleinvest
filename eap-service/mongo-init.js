// MongoDB 초기화 스크립트 (Docker용)

// 데이터베이스 선택
db = db.getSiblingDB('eap-service');

// 기본 관리자 계정 생성
db.createUser({
  user: "eap_admin",
  pwd: "eap_password_123",
  roles: [
    {
      role: "readWrite",
      db: "eap-service"
    }
  ]
});

// 기본 회사 데이터 생성
db.companies.insertOne({
  name: "테스트 컴퍼니",
  domain: "test.com",
  industry: "IT 서비스",
  settings: {
    departments: [
      "경영진",
      "IT개발팀", 
      "마케팅팀",
      "영업팀",
      "인사팀",
      "재무팀",
      "총무팀",
      "기획팀",
      "디자인팀",
      "품질관리팀"
    ],
    maxEmployees: 100,
    allowSelfRegistration: true,
    annualCounselingLimit: 12
  },
  businessMetrics: {
    annualRevenue: 1000000000,
    avgEmployeeSalary: 50000000,
    preEapAbsenteeismDays: 400,
    preEapTurnoverRate: 15,
    dailyProductivityPerEmployee: 200000,
    recruitmentTrainingCost: 10000000
  },
  balance: 0,
  totalSessionsUsed: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// 인덱스 생성
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "company": 1 });
db.companies.createIndex({ "name": 1 }, { unique: true });
db.companies.createIndex({ "domain": 1 }, { unique: true });
db.counselingsessions.createIndex({ "company": 1 });
db.counselingsessions.createIndex({ "employee": 1 });
db.counselingsessions.createIndex({ "counselor": 1 });
db.counselingsessions.createIndex({ "appointmentDate": 1 });

print("MongoDB 초기화 완료!");