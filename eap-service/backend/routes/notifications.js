const express = require('express');
const { body, validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 사용자의 알림 목록 조회
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, isRead, type } = req.query;
    
    let filter = { recipient: req.user._id };
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (type) filter.type = type;

    const notifications = await Notification.find(filter)
      .populate('sender', 'name role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.getUnreadCount(req.user._id);

    res.json({
      success: true,
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      unreadCount
    });

  } catch (error) {
    console.error('알림 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 읽지 않은 알림 수 조회
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.user._id);
    
    res.json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('읽지 않은 알림 수 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 알림 읽음 처리
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '알림을 찾을 수 없습니다.'
      });
    }

    // 본인의 알림만 읽음 처리 가능
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '권한이 없습니다.'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: '알림이 읽음 처리되었습니다.',
      notification
    });

  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 모든 알림 읽음 처리
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { 
        recipient: req.user._id, 
        isRead: false 
      },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount}개의 알림이 읽음 처리되었습니다.`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('모든 알림 읽음 처리 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 알림 삭제
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '알림을 찾을 수 없습니다.'
      });
    }

    // 본인의 알림만 삭제 가능
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '권한이 없습니다.'
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '알림이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('알림 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 시스템 공지 생성 (Super Admin용)
router.post('/system-announcement', [auth, authorize(['super-admin'])], [
  body('title').trim().isLength({ min: 1 }).withMessage('제목을 입력하세요.'),
  body('message').trim().isLength({ min: 1 }).withMessage('내용을 입력하세요.'),
  body('recipients').optional().isArray().withMessage('수신자는 배열이어야 합니다.'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('expiresAt').optional().isISO8601().withMessage('유효한 만료 날짜를 입력하세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, message, recipients, priority = 'normal', expiresAt } = req.body;
    
    let targetRecipients = recipients;
    
    // recipients가 없으면 모든 활성 사용자에게 전송
    if (!recipients || recipients.length === 0) {
      const allUsers = await User.find({ isActive: true }).select('_id');
      targetRecipients = allUsers.map(user => user._id);
    }

    const notificationData = {
      sender: req.user._id,
      type: 'system_announcement',
      title,
      message,
      priority,
      ...(expiresAt && { expiresAt: new Date(expiresAt) })
    };

    const result = await Notification.createBulkNotification(targetRecipients, notificationData);

    res.json({
      success: true,
      message: `${result.length}명에게 공지사항이 전송되었습니다.`,
      notificationCount: result.length
    });

  } catch (error) {
    console.error('시스템 공지 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 실시간 알림을 위한 Server-Sent Events (선택적)
router.get('/stream', auth, async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // 주기적으로 읽지 않은 알림 수 전송
  const sendUnreadCount = async () => {
    try {
      const unreadCount = await Notification.getUnreadCount(req.user._id);
      res.write(`data: ${JSON.stringify({ type: 'unreadCount', count: unreadCount })}\n\n`);
    } catch (error) {
      console.error('SSE 알림 전송 오류:', error);
    }
  };

  // 초기 전송
  await sendUnreadCount();

  // 30초마다 업데이트
  const interval = setInterval(sendUnreadCount, 30000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

module.exports = router;