const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  domain: {
    type: String,
    required: true,
    unique: true
  },
  industry: {
    type: String,
    required: true
  },
  // 회사 어드민 연결
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  businessRegistrationNumber: {
    type: String,
    sparse: true // null 값에 대해서는 unique 제약을 무시
  },
  address: {
    type: String
  },
  phone: {
    type: String
  },
  email: {
    type: String,
    lowercase: true
  },
  contactPerson: {
    name: String,
    position: String,
    phone: String,
    email: String
  },
  // 서비스 플랜
  plan: {
    type: String,
    enum: ['basic', 'standard', 'premium', 'enterprise'],
    default: 'standard'
  },
  // 잔액 및 사용량
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSessionsUsed: {
    type: Number,
    default: 0
  },
  monthlyUsage: [{
    year: Number,
    month: Number,
    sessionsCount: Number,
    totalCost: Number
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  // 설정
  settings: {
    maxEmployees: {
      type: Number,
      default: 100
    },
    allowSelfRegistration: {
      type: Boolean,
      default: false
    },
    // 직원별 연간 상담 한도
    annualCounselingLimit: {
      type: Number,
      default: 12, // 기본 연간 12회
      min: 1
    },
    notificationEmails: [String],
    // 표준 부서 목록
    departments: {
      type: [String],
      default: ['경영진', 'IT개발팀', '마케팅팀', '영업팀', '인사팀', '재무팀', '총무팀', '기획팀', '디자인팀', '품질관리팀']
    }
  },
  // ROI 계산을 위한 회사 기본 정보
  businessMetrics: {
    // 연간 매출
    annualRevenue: {
      type: Number,
      default: 0
    },
    // 직원 1인당 평균 연봉
    avgEmployeeSalary: {
      type: Number,
      default: 50000000 // 5천만원
    },
    // EAP 도입 전 연간 결근일수 (전체 직원 기준)
    preEapAbsenteeismDays: {
      type: Number,
      default: 0
    },
    // EAP 도입 전 연간 이직률 (%)
    preEapTurnoverRate: {
      type: Number,
      default: 15 // 15%
    },
    // 업종별 생산성 지표 (일일 직원 1인당 매출 기여도)
    dailyProductivityPerEmployee: {
      type: Number,
      default: 200000 // 20만원/일
    },
    // 신규 직원 채용/교육 비용
    recruitmentTrainingCost: {
      type: Number,
      default: 10000000 // 1천만원
    }
  }
}, {
  timestamps: true
});

// 잔액 차감 메서드
companySchema.methods.deductBalance = function(amount) {
  if (this.balance >= amount || this.settings.allowOverage) {
    this.balance = Math.max(0, this.balance - amount);
    this.totalSessionsUsed += 1;
    return true;
  }
  return false;
};

// 월별 사용량 업데이트
companySchema.methods.updateMonthlyUsage = function(year, month, cost) {
  const existingMonth = this.monthlyUsage.find(
    usage => usage.year === year && usage.month === month
  );
  
  if (existingMonth) {
    existingMonth.sessionsCount += 1;
    existingMonth.totalCost += cost;
  } else {
    this.monthlyUsage.push({
      year,
      month,
      sessionsCount: 1,
      totalCost: cost
    });
  }
};

module.exports = mongoose.model('Company', companySchema);