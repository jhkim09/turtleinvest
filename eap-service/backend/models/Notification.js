const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // 시스템 알림의 경우 null일 수 있음
  },
  type: {
    type: String,
    enum: [
      'dispute_submitted',    // 이의제기 제출
      'dispute_resolved',     // 이의제기 처리 완료
      'assignment_new',       // 새 상담 배정
      'session_reminder',     // 상담 일정 알림
      'payment_processed',    // 정산 완료
      'system_announcement'   // 시스템 공지
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // 관련 데이터 (세션 ID, 이의제기 ID 등)
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  // 알림 표시 방식
  displayType: {
    type: String,
    enum: ['popup', 'badge', 'email', 'sms'],
    default: 'popup'
  },
  // 만료 날짜 (선택적)
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// 인덱스 설정
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 가상 필드: 알림이 새로운지 확인 (24시간 이내)
notificationSchema.virtual('isNew').get(function() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.createdAt > oneDayAgo && !this.isRead;
});

// 알림 읽음 처리
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// 특정 사용자의 읽지 않은 알림 수 조회
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ recipient: userId, isRead: false });
};

// 특정 타입의 알림 일괄 생성 (예: 시스템 공지)
notificationSchema.statics.createBulkNotification = async function(recipients, notificationData) {
  const notifications = recipients.map(recipientId => ({
    recipient: recipientId,
    ...notificationData
  }));
  
  return this.insertMany(notifications);
};

// toJSON 설정
notificationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);