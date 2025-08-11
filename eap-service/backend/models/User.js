const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'counselor', 'company-admin', 'super-admin'],
    default: 'employee'
  },
  department: {
    type: String,
    required: function() { return this.role === 'employee'; }
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // 회사 연결 (회사어드민, 직원, 매니저용)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function() { 
      return ['company-admin', 'employee', 'manager'].includes(this.role); 
    }
  },
  // 상담사 전용 필드들
  customRate: {
    type: Number,
    min: 0,
    required: function() { return this.role === 'counselor'; }
  },
  useSystemRate: {
    type: Boolean,
    default: true,
    required: function() { return this.role === 'counselor'; }
  },
  // 상담사 세금 설정
  taxRate: {
    type: Number,
    enum: [3.3, 10],
    default: 3.3,
    required: function() { return this.role === 'counselor'; }
  },
  // 상담센터 관련 필드들
  counselingCenter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CounselingCenter',
    required: function() { return this.role === 'counselor' && !this.isIndependent; }
  },
  isIndependent: {
    type: Boolean,
    default: function() { return this.role === 'counselor'; },
    required: function() { return this.role === 'counselor'; }
  },
  // 직원 연간 상담 사용량 추적
  annualCounselingUsage: {
    year: {
      type: Number,
      default: new Date().getFullYear()
    },
    used: {
      type: Number,
      default: 0
    },
    limit: {
      type: Number,
      default: 12
    }
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);