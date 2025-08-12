const mongoose = require('mongoose');

const counselingSessionSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  counselor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // 초기 생성 시에는 필요 없음, 배정 시 설정
  },
  company: {
    type: String, // 직원의 소속 회사
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // 분 단위
    default: 50
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  sessionType: {
    type: String,
    enum: ['individual', 'group', 'family', 'crisis'],
    default: 'individual'
  },
  counselingMethod: {
    type: String,
    enum: ['faceToFace', 'phoneVideo', 'chat'],
    required: true,
    default: 'faceToFace'
  },
  topic: {
    type: String,
    required: true
  },
  urgencyLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  // 상담 기록
  sessionRecord: {
    // 🔓 공유 데이터 (직원과 상담사 모두 볼 수 있음)
    sharedContent: {
      sessionSummary: { type: String }, // 세션 요약
      generalTopics: [String], // 일반적인 주제들
      copingStrategies: [String], // 대처 방안
      wellnessGoals: [String], // 웰빙 목표
      nextSteps: [String], // 다음 단계
      followUpNeeded: { type: Boolean, default: false },
      nextSessionDate: { type: Date },
      progressNotes: { type: String } // 진전사항
    },
    
    // 🔒 상담사 전용 데이터 (상담사만 볼 수 있음)
    counselorOnlyContent: {
      clinicalAssessment: { type: String }, // 임상적 평가
      psychologicalState: { type: String }, // 심리상태 분석
      riskAssessment: { type: String }, // 위험 평가
      confidentialNotes: { type: String }, // 기밀 상담 노트
      treatmentPlan: { type: String }, // 치료 계획
      professionalObservations: { type: String }, // 전문가 관찰
      mentalHealthConcerns: [String], // 정신건강 우려사항
      referralNeeded: { type: Boolean, default: false }, // 전문의 의뢰 필요
      referralNotes: { type: String } // 의뢰 관련 메모
    }
  },
  // 위기 상황 관리 (수퍼어드민용)
  isCrisisCase: {
    type: Boolean,
    default: false
  },
  crisisLevel: {
    type: String,
    enum: ['none', 'watch', 'concern', 'urgent', 'emergency'],
    default: 'none'
  },
  crisisNotes: {
    type: String, // 상담사가 수퍼어드민에게 남기는 메모
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  adminNotified: {
    type: Boolean,
    default: false
  },
  nextAppointment: {
    type: Date
  },
  // 평가 (직원이 상담 후 작성)
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String
  },
  // 배정 상태
  assignmentStatus: {
    type: String,
    enum: ['pending', 'assigned', 'confirmed'],
    default: 'pending'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Super Admin
  },
  assignmentNotes: {
    type: String // 배정 시 특이사항
  },
  // 정산용 정보
  counselorRate: {
    type: Number, // 이 세션의 상담사 수수료
    required: true
  },
  isCharged: {
    type: Boolean, // 회사에 청구되었는지
    default: false
  },
  chargeDate: {
    type: Date
  },
  isPaidToCounselor: {
    type: Boolean, // 상담사에게 지급되었는지
    default: false
  },
  paymentDate: {
    type: Date
  },

  // 이의제기 관련 필드
  disputeStatus: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'rejected'],
    default: null
  },
  disputeReason: {
    type: String,
    trim: true
  },
  disputeType: {
    type: String,
    enum: ['payment', 'session', 'rating', 'other'],
    default: 'payment'
  },
  disputeDescription: {
    type: String,
    trim: true
  },
  disputeSubmittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  disputeSubmittedAt: {
    type: Date
  },
  disputeResolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  disputeResolvedAt: {
    type: Date
  },
  disputeResolution: {
    type: String,
    trim: true
  },
  disputeAdminNotes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// 상담 기록 접근 권한 체크 미들웨어
counselingSessionSchema.methods.canViewDetails = function(userId, userRole) {
  // 직원 본인 또는 담당 상담사만 상세 내용 열람 가능
  return (
    this.employee.toString() === userId.toString() ||
    this.counselor.toString() === userId.toString() ||
    userRole === 'super-admin'
  );
};

module.exports = mongoose.model('CounselingSession', counselingSessionSchema);