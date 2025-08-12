const mongoose = require('mongoose');

// 재무상담 세션 스키마
const financialSessionSchema = new mongoose.Schema({
  // 기본 정보
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  financialAdvisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 일정 정보
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // 분 단위
    default: 60
  },
  
  // 상담 유형
  sessionType: {
    type: String,
    enum: ['initial-consultation', 'portfolio-review', 'goal-planning', 'investment-advice', 'retirement-planning', 'insurance-planning', 'tax-planning'],
    required: true
  },
  
  // 상담 방식
  format: {
    type: String,
    enum: ['in-person', 'video-call', 'phone-call'],
    default: 'video-call'
  },
  
  // 상담 상태
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  
  // 상담 전 준비사항
  preparation: {
    documentsRequested: [String], // 요청 서류
    questionsToDiscuss: [String], // 논의할 질문들
    clientPreparation: { type: String } // 고객 준비사항
  },
  
  // 상담 내용 (완료 후 작성)
  sessionRecord: {
    // 🔓 공유 데이터 (직원과 상담사 모두 볼 수 있음)
    sharedContent: {
      mainTopics: [String], // 주요 논의사항
      currentSituation: { type: String }, // 현재 상황
      clientConcerns: [String], // 고객 우려사항
      generalRecommendations: [String], // 일반적인 권고사항
      actionItems: [String], // 실행 항목
      followUpNeeded: { type: Boolean, default: false },
      nextSessionDate: { type: Date },
      sessionSummary: { type: String } // 세션 요약
    },
    
    // 🔒 상담사 전용 데이터 (상담사만 볼 수 있음)
    advisorOnlyContent: {
      professionalAssessment: { type: String }, // 전문가 평가
      riskAnalysis: { type: String }, // 위험 분석
      confidentialNotes: { type: String }, // 기밀 메모
      advisorRecommendations: [String], // 전문가 권고사항
      clientPsychologicalState: { type: String }, // 고객 심리상태
      concernLevel: { 
        type: String, 
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'low'
      }
    }
  },
  
  // 제공된 자료
  materialsProvided: [{
    title: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['report', 'presentation', 'calculator', 'guide', 'form'], 
      required: true 
    },
    description: { type: String },
    fileUrl: { type: String } // 파일 URL (선택사항)
  }],
  
  // 고객 만족도 (선택사항)
  clientFeedback: {
    rating: { 
      type: Number, 
      min: 1, 
      max: 5 
    },
    comments: { type: String },
    wouldRecommend: { type: Boolean }
  },
  
  // 비용 정보
  fee: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'KRW' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'waived'],
      default: 'pending'
    }
  }
}, {
  timestamps: true
});

// 인덱스 설정 - 효율적인 조회를 위해
financialSessionSchema.index({ client: 1, scheduledDate: -1 });
financialSessionSchema.index({ financialAdvisor: 1, scheduledDate: -1 });
financialSessionSchema.index({ status: 1, scheduledDate: 1 });

// 가상 필드 - 상담 완료 여부
financialSessionSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// 가상 필드 - 예정된 상담인지
financialSessionSchema.virtual('isUpcoming').get(function() {
  return this.status === 'scheduled' && new Date(this.scheduledDate) > new Date();
});

module.exports = mongoose.model('FinancialSession', financialSessionSchema);