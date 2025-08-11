const mongoose = require('mongoose');

const counselorPaymentSchema = new mongoose.Schema({
  counselor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Counselor',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  // 세션별 상세 내역
  sessions: [{
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CounselingSession',
      required: true
    },
    company: String,
    employeeName: String,
    date: Date,
    method: {
      type: String,
      enum: ['faceToFace', 'phoneVideo', 'chat']
    },
    duration: Number,
    rate: Number,
    amount: Number
  }],
  // 월별 집계
  summary: {
    totalSessions: {
      type: Number,
      default: 0
    },
    faceToFaceSessions: {
      type: Number,
      default: 0
    },
    phoneVideoSessions: {
      type: Number,
      default: 0
    },
    chatSessions: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    netAmount: {
      type: Number,
      default: 0
    }
  },
  // 지급 상태
  status: {
    type: String,
    enum: ['pending', 'processing', 'settling', 'completed', 'dispute'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Super Admin
  },
  approvedAt: {
    type: Date
  },
  paidAt: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'check', 'digital_wallet']
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// 복합 인덱스 (상담사, 년, 월)
counselorPaymentSchema.index({ counselor: 1, year: 1, month: 1 }, { unique: true });

// 월별 정산서 생성 메서드
counselorPaymentSchema.methods.generateStatement = function() {
  const statement = {
    counselorName: this.counselor.name,
    period: `${this.year}년 ${this.month}월`,
    sessions: this.sessions.map(session => ({
      date: session.date.toLocaleDateString('ko-KR'),
      company: session.company,
      method: this.getMethodName(session.method),
      duration: `${session.duration}분`,
      rate: `${session.rate.toLocaleString()}원`,
      amount: `${session.amount.toLocaleString()}원`
    })),
    summary: {
      totalSessions: this.summary.totalSessions,
      totalAmount: `${this.summary.totalAmount.toLocaleString()}원`,
      taxAmount: `${this.summary.taxAmount.toLocaleString()}원`,
      netAmount: `${this.summary.netAmount.toLocaleString()}원`
    },
    status: this.getStatusName(this.status)
  };
  
  return statement;
};

counselorPaymentSchema.methods.getMethodName = function(method) {
  const names = {
    faceToFace: '대면',
    phoneVideo: '전화/화상',
    chat: '채팅'
  };
  return names[method] || method;
};

counselorPaymentSchema.methods.getStatusName = function(status) {
  const names = {
    pending: '정산 대기',
    processing: '지급중',
    settling: '정산중',
    completed: '정산완료',
    dispute: '이의 제기'
  };
  return names[status] || status;
};

module.exports = mongoose.model('CounselorPayment', counselorPaymentSchema);