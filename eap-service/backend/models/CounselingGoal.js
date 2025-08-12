const mongoose = require('mongoose');

const counselingGoalSchema = new mongoose.Schema({
  // 기본 정보
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  counselor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  relatedSession: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sessionType'
  },
  sessionType: {
    type: String,
    enum: ['Appointment', 'CounselingSession', 'FinancialSession'],
    required: true
  },
  
  // 목표 내용
  title: {
    type: String,
    required: true,
    maxLength: 100
  },
  description: {
    type: String,
    required: true,
    maxLength: 500
  },
  category: {
    type: String,
    enum: ['mental-health', 'stress-management', 'work-life-balance', 'financial-planning', 'investment', 'saving', 'debt-management', 'career-development', 'skill-improvement', 'relationship', 'other'],
    required: true
  },
  
  // 목표 설정
  targetValue: {
    type: String, // 예: "주 3회", "월 50만원", "3개월 내" 등
    required: true
  },
  currentValue: {
    type: String,
    default: '0'
  },
  unit: {
    type: String, // 예: "회", "원", "점수" 등
    required: true
  },
  
  // 기간 및 상태
  startDate: {
    type: Date,
    default: Date.now
  },
  targetDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active'
  },
  progress: {
    type: Number, // 0-100 퍼센트
    default: 0,
    min: 0,
    max: 100
  },
  
  // 세부 내용
  actionSteps: [{
    step: String,
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  
  // 진행 업데이트
  progressUpdates: [{
    date: {
      type: Date,
      default: Date.now
    },
    value: String,
    note: String,
    updatedBy: {
      type: String,
      enum: ['employee', 'counselor'],
      required: true
    }
  }],
  
  // 상담사 메모
  counselorNotes: {
    type: String,
    maxLength: 1000
  },
  
  // 다음 리뷰 일정
  nextReviewDate: Date,
  
  // 우선순위
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// 인덱스 설정
counselingGoalSchema.index({ employee: 1, status: 1 });
counselingGoalSchema.index({ counselor: 1, status: 1 });
counselingGoalSchema.index({ targetDate: 1, status: 1 });

// 가상 필드 - 달성률 계산
counselingGoalSchema.virtual('achievementRate').get(function() {
  if (this.status === 'completed') return 100;
  return this.progress;
});

// 가상 필드 - 남은 일수
counselingGoalSchema.virtual('remainingDays').get(function() {
  if (this.status === 'completed') return 0;
  const now = new Date();
  const target = new Date(this.targetDate);
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// 액션 스텝 완료율 계산 메서드
counselingGoalSchema.methods.getActionStepCompletion = function() {
  if (this.actionSteps.length === 0) return 0;
  const completedSteps = this.actionSteps.filter(step => step.isCompleted).length;
  return Math.round((completedSteps / this.actionSteps.length) * 100);
};

// 목표 업데이트 메서드
counselingGoalSchema.methods.updateProgress = function(value, note, updatedBy) {
  this.currentValue = value;
  this.progressUpdates.push({
    value: value,
    note: note,
    updatedBy: updatedBy
  });
  
  // 진행률 자동 계산 (숫자 값인 경우)
  const target = parseFloat(this.targetValue);
  const current = parseFloat(value);
  if (!isNaN(target) && !isNaN(current)) {
    this.progress = Math.min(100, Math.round((current / target) * 100));
    if (this.progress >= 100) {
      this.status = 'completed';
    }
  }
};

module.exports = mongoose.model('CounselingGoal', counselingGoalSchema);