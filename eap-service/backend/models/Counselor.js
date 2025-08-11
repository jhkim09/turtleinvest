const mongoose = require('mongoose');

const counselorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true
  },
  specialties: [{
    type: String,
    required: true
  }],
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  experience: {
    type: Number, // 경력 년수
    required: true,
    min: 0
  },
  rates: {
    faceToFace: {
      type: Number, // 대면 상담 단가
      required: true,
      min: 0
    },
    phoneVideo: {
      type: Number, // 전화/화상 상담 단가
      required: true,
      min: 0
    },
    chat: {
      type: Number, // 채팅 상담 단가
      required: true,
      min: 0
    }
  },
  maxDailyAppointments: {
    type: Number,
    default: 8,
    min: 1
  },
  availableHours: {
    monday: { start: String, end: String, available: Boolean },
    tuesday: { start: String, end: String, available: Boolean },
    wednesday: { start: String, end: String, available: Boolean },
    thursday: { start: String, end: String, available: Boolean },
    friday: { start: String, end: String, available: Boolean },
    saturday: { start: String, end: String, available: Boolean },
    sunday: { start: String, end: String, available: Boolean }
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

// 비밀번호 해싱
counselorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 비밀번호 비교
counselorSchema.methods.comparePassword = async function(password) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Counselor', counselorSchema);