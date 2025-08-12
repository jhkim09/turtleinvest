const mongoose = require('mongoose');

// 재무 프로필 스키마 - 고객의 재무 상태 관리
const financialProfileSchema = new mongoose.Schema({
  // 기본 정보
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  financialAdvisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 재무 현황
  currentAssets: {
    cash: { type: Number, default: 0 }, // 현금
    savings: { type: Number, default: 0 }, // 저축
    investments: { type: Number, default: 0 }, // 투자자산
    realEstate: { type: Number, default: 0 }, // 부동산
    other: { type: Number, default: 0 } // 기타자산
  },
  
  currentLiabilities: {
    creditCard: { type: Number, default: 0 }, // 신용카드
    loans: { type: Number, default: 0 }, // 대출
    mortgage: { type: Number, default: 0 }, // 주택담보대출
    other: { type: Number, default: 0 } // 기타부채
  },
  
  monthlyIncome: {
    salary: { type: Number, default: 0 }, // 급여
    business: { type: Number, default: 0 }, // 사업소득
    investment: { type: Number, default: 0 }, // 투자소득
    other: { type: Number, default: 0 } // 기타소득
  },
  
  monthlyExpenses: {
    living: { type: Number, default: 0 }, // 생활비
    housing: { type: Number, default: 0 }, // 주거비
    insurance: { type: Number, default: 0 }, // 보험료
    education: { type: Number, default: 0 }, // 교육비
    other: { type: Number, default: 0 } // 기타지출
  },
  
  // 재무 목표
  financialGoals: [{
    title: { type: String, required: true }, // 목표명
    targetAmount: { type: Number, required: true }, // 목표금액
    targetDate: { type: Date, required: true }, // 목표일자
    currentAmount: { type: Number, default: 0 }, // 현재금액
    priority: { 
      type: String, 
      enum: ['high', 'medium', 'low'], 
      default: 'medium' 
    },
    status: {
      type: String,
      enum: ['planning', 'in-progress', 'achieved', 'suspended'],
      default: 'planning'
    }
  }],
  
  // 투자 성향
  riskProfile: {
    type: String,
    enum: ['conservative', 'moderate', 'aggressive'],
    default: 'moderate'
  },
  
  investmentExperience: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  
  // 상담 이력
  lastConsultationDate: { type: Date },
  nextConsultationDate: { type: Date },
  consultationNotes: { type: String },
  
  // 추천 포트폴리오
  recommendedPortfolio: [{
    assetType: { type: String, required: true }, // 자산유형
    allocation: { type: Number, required: true }, // 배분비율
    expectedReturn: { type: Number }, // 예상수익률
    risk: { type: String, enum: ['low', 'medium', 'high'] }
  }],
  
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// 가상 필드 - 순자산 계산
financialProfileSchema.virtual('netWorth').get(function() {
  const totalAssets = Object.values(this.currentAssets).reduce((sum, val) => sum + (val || 0), 0);
  const totalLiabilities = Object.values(this.currentLiabilities).reduce((sum, val) => sum + (val || 0), 0);
  return totalAssets - totalLiabilities;
});

// 가상 필드 - 월 순소득 계산
financialProfileSchema.virtual('monthlyNetIncome').get(function() {
  const totalIncome = Object.values(this.monthlyIncome).reduce((sum, val) => sum + (val || 0), 0);
  const totalExpenses = Object.values(this.monthlyExpenses).reduce((sum, val) => sum + (val || 0), 0);
  return totalIncome - totalExpenses;
});

module.exports = mongoose.model('FinancialProfile', financialProfileSchema);