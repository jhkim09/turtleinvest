const mongoose = require('mongoose');

// 자료실 스키마
const resourceSchema = new mongoose.Schema({
  // 기본 정보
  title: {
    type: String,
    required: true,
    maxLength: 200
  },
  content: {
    type: String,
    required: true,
    maxLength: 10000
  },
  category: {
    type: String,
    enum: ['심리건강', '재무관리', '직장생활', '자기계발', '법률정보', '복리후생', '건강관리', '기타'],
    required: true
  },
  
  // 작성자 정보
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 파일 첨부
  attachments: [{
    originalName: String, // 원본 파일명
    filename: String, // 저장된 파일명
    path: String, // 파일 경로
    size: Number, // 파일 크기
    mimetype: String, // 파일 타입
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 링크 첨부
  links: [{
    title: String,
    url: String,
    description: String
  }],
  
  // 공지사항 여부
  isPinned: {
    type: Boolean,
    default: false
  },
  
  // 공개 범위
  visibility: {
    type: String,
    enum: ['all', 'employees-only', 'counselors-only', 'advisors-only'],
    default: 'all'
  },
  
  // 조회수
  viewCount: {
    type: Number,
    default: 0
  },
  
  // 좋아요
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // 상태
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  
  // 게시 기간
  publishedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  
  // 태그
  tags: [String],
  
  // 중요도
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // 댓글 허용 여부
  allowComments: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 인덱스 설정
resourceSchema.index({ category: 1, status: 1, publishedAt: -1 });
resourceSchema.index({ isPinned: -1, publishedAt: -1 });
resourceSchema.index({ visibility: 1, status: 1 });
resourceSchema.index({ title: 'text', content: 'text', tags: 'text' });

// 가상 필드
resourceSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// 메서드
resourceSchema.methods.isVisibleTo = function(userRole) {
  if (this.visibility === 'all') return true;
  if (this.visibility === 'employees-only' && userRole === 'employee') return true;
  if (this.visibility === 'counselors-only' && userRole === 'counselor') return true;
  if (this.visibility === 'advisors-only' && userRole === 'financial-advisor') return true;
  return false;
};

resourceSchema.methods.incrementView = function() {
  this.viewCount = (this.viewCount || 0) + 1;
  return this.save();
};

resourceSchema.methods.toggleLike = function(userId) {
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
  
  if (existingLike) {
    // 좋아요 취소
    this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  } else {
    // 좋아요 추가
    this.likes.push({ user: userId });
  }
  
  return this.save();
};

module.exports = mongoose.model('Resource', resourceSchema);