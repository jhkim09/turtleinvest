const mongoose = require('mongoose');

const counselingCenterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['center', 'independent'],
    default: 'center'
  },
  description: {
    type: String,
    trim: true
  },
  adminUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  counselors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  businessLicense: {
    type: String,
    required: false
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: '대한민국' }
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  specialties: [{
    type: String,
    enum: [
      '재무상담', '법률상담', '스트레스 관리', '직장 내 갈등',
      '업무 효율성', '워라밸', '진로 상담', '심리치료',
      '가족상담', '중독치료', '정신건강', '기타'
    ]
  }],
  operatingHours: {
    monday: { start: String, end: String, isOpen: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, isOpen: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, isOpen: { type: Boolean, default: true } },
    thursday: { start: String, end: String, isOpen: { type: Boolean, default: true } },
    friday: { start: String, end: String, isOpen: { type: Boolean, default: true } },
    saturday: { start: String, end: String, isOpen: { type: Boolean, default: false } },
    sunday: { start: String, end: String, isOpen: { type: Boolean, default: false } }
  },
  settings: {
    maxCounselors: { type: Number, default: 10 },
    allowOnlineBooking: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalSessions: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 인덱스 설정
counselingCenterSchema.index({ name: 1 });
counselingCenterSchema.index({ type: 1 });
counselingCenterSchema.index({ isActive: 1 });
counselingCenterSchema.index({ adminUser: 1 });

// 가상 필드: 활성 상담사 수
counselingCenterSchema.virtual('activeCounselorCount').get(function() {
  return this.counselors ? this.counselors.length : 0;
});

// 센터 삭제 시 소속 상담사들의 센터 정보도 제거
counselingCenterSchema.pre('remove', async function(next) {
  try {
    const User = mongoose.model('User');
    await User.updateMany(
      { counselingCenter: this._id },
      { 
        $unset: { counselingCenter: 1 },
        $set: { isIndependent: true }
      }
    );
    next();
  } catch (error) {
    next(error);
  }
});

// toJSON 설정
counselingCenterSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('CounselingCenter', counselingCenterSchema);