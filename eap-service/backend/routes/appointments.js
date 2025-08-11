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
  body('reason').trim().isLength({ min: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { counselorId, scheduledDate, duration, type, reason, notes } = req.body;

    const counselor = await User.findOne({ _id: counselorId, role: 'counselor', isActive: true });
    if (!counselor) {
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

    await appointment.save();
    await appointment.populate('counselor', 'name email');

    res.status(201).json(appointment);
  } catch (error) {
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