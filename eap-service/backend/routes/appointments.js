const express = require('express');
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (req.user.role === 'counselor') {
      query.counselor = req.user._id;
    }

    const appointments = await Appointment.find(query)
      .populate('employee', 'name email employeeId department')
      .populate('counselor', 'name email')
      .sort({ scheduledDate: -1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/', [auth, authorize('employee', 'admin')], [
  body('counselorId').isMongoId(),
  body('scheduledDate').isISO8601(),
  body('reason').trim().isLength({ min: 2, max: 200 }).withMessage('상담 사유는 2자 이상 200자 이하로 입력해주세요.')
], async (req, res) => {
  try {
    console.log('=== 심리상담 예약 요청 ===');
    console.log('사용자:', req.user.name, '(', req.user.email, ')');
    console.log('요청 데이터:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation 오류:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { counselorId, scheduledDate, duration, type, reason, notes } = req.body;

    console.log('상담사 조회 중:', counselorId);
    const counselor = await User.findOne({ _id: counselorId, role: 'counselor', isActive: true });
    console.log('조회된 상담사:', counselor ? counselor.name : '없음');
    if (!counselor) {
      console.log('상담사를 찾을 수 없음');
      return res.status(400).json({ message: '유효하지 않은 상담사입니다.' });
    }

    const conflictingAppointment = await Appointment.findOne({
      counselor: counselorId,
      scheduledDate: new Date(scheduledDate),
      status: { $in: ['scheduled'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({ message: '해당 시간에 이미 예약된 상담이 있습니다.' });
    }

    const appointment = new Appointment({
      employee: req.user._id,
      counselor: counselorId,
      scheduledDate: new Date(scheduledDate),
      duration: duration || 60,
      type: type || 'individual',
      reason,
      notes
    });

    console.log('예약 저장 중...');
    await appointment.save();
    console.log('예약 저장 완료:', appointment._id);
    
    await appointment.populate('counselor', 'name email');
    console.log('✅ 예약 생성 성공');

    res.status(201).json(appointment);
  } catch (error) {
    console.error('예약 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.put('/:id/status', [auth, authorize('counselor', 'admin')], [
  body('status').isIn(['scheduled', 'completed', 'cancelled', 'no-show'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: '예약을 찾을 수 없습니다.' });
    }

    if (req.user.role === 'counselor' && appointment.counselor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    appointment.status = status;
    await appointment.save();

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;