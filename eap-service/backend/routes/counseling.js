const express = require('express');
const { body, validationResult } = require('express-validator');
const CounselingRecord = require('../models/CounselingRecord');
const Appointment = require('../models/Appointment');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/records', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (req.user.role === 'counselor') {
      query.counselor = req.user._id;
    }

    const records = await CounselingRecord.find(query)
      .populate('employee', 'name employeeId department')
      .populate('counselor', 'name')
      .populate('appointment', 'scheduledDate')
      .sort({ sessionDate: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/records', [auth, authorize('counselor')], [
  body('appointmentId').isMongoId(),
  body('sessionDate').isISO8601(),
  body('sessionType').isIn(['individual', 'group', 'emergency']),
  body('mainIssues').isArray(),
  body('sessionNotes').trim().isLength({ min: 20 }),
  body('riskLevel').isIn(['low', 'medium', 'high'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      appointmentId,
      sessionDate,
      sessionType,
      mainIssues,
      sessionNotes,
      recommendations,
      followUpRequired,
      nextAppointmentDate,
      riskLevel
    } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: '예약을 찾을 수 없습니다.' });
    }

    if (appointment.counselor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const existingRecord = await CounselingRecord.findOne({ appointment: appointmentId });
    if (existingRecord) {
      return res.status(400).json({ message: '이미 상담 기록이 존재합니다.' });
    }

    const record = new CounselingRecord({
      appointment: appointmentId,
      employee: appointment.employee,
      counselor: req.user._id,
      sessionDate: new Date(sessionDate),
      sessionType,
      mainIssues,
      sessionNotes,
      recommendations,
      followUpRequired: followUpRequired || false,
      nextAppointmentDate: nextAppointmentDate ? new Date(nextAppointmentDate) : null,
      riskLevel: riskLevel || 'low'
    });

    await record.save();
    
    appointment.status = 'completed';
    await appointment.save();

    await record.populate('employee', 'name employeeId department');
    await record.populate('appointment', 'scheduledDate');

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.get('/records/:id', auth, async (req, res) => {
  try {
    const record = await CounselingRecord.findById(req.params.id)
      .populate('employee', 'name employeeId department')
      .populate('counselor', 'name')
      .populate('appointment', 'scheduledDate');

    if (!record) {
      return res.status(404).json({ message: '상담 기록을 찾을 수 없습니다.' });
    }

    if (req.user.role === 'employee' && record.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    if (req.user.role === 'counselor' && record.counselor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;