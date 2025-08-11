const express = require('express');
const { body, validationResult } = require('express-validator');
const CounselorPayment = require('../models/CounselorPayment');
const CounselingSession = require('../models/CounselingSession');
const Counselor = require('../models/Counselor');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 상담사별 정산 목록 조회
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, year, month, counselorId } = req.query;
    let filter = {};

    // 역할별 필터링
    if (req.user.role === 'counselor') {
      // 상담사는 본인 정산만 조회 가능
      const counselor = await Counselor.findOne({ email: req.user.email });
      if (counselor) {
        filter.counselor = counselor._id;
      }
    } else if (req.user.role === 'super-admin') {
      // Super Admin은 모든 정산 조회 가능
      if (counselorId) filter.counselor = counselorId;
    } else {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    if (status) filter.status = status;
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);

    const payments = await CounselorPayment.find(filter)
      .populate('counselor', 'name email phone')
      .populate('approvedBy', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ year: -1, month: -1 });

    const total = await CounselorPayment.countDocuments(filter);

    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('정산 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 특정 정산 상세 조회
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await CounselorPayment.findById(id)
      .populate('counselor', 'name email phone')
      .populate('approvedBy', 'name')
      .populate('sessions.sessionId', 'employee counselor company appointmentDate topic counselingMethod duration');

    if (!payment) {
      return res.status(404).json({ message: '정산 내역을 찾을 수 없습니다.' });
    }

    // 권한 확인
    if (req.user.role === 'counselor') {
      const counselor = await Counselor.findOne({ email: req.user.email });
      if (!counselor || payment.counselor._id.toString() !== counselor._id.toString()) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    } else if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    res.json(payment);
  } catch (error) {
    console.error('정산 상세 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 월별 정산서 생성 (Super Admin용)
router.post('/generate', [auth, authorize(['super-admin'])], [
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('유효한 년도를 입력하세요.'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('유효한 월을 입력하세요.'),
  body('counselorId').optional().isMongoId().withMessage('유효한 상담사 ID를 입력하세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { year, month, counselorId } = req.body;

    // 해당 월의 완료된 세션 조회
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    let sessionFilter = {
      status: 'completed',
      appointmentDate: { $gte: startDate, $lte: endDate },
      isPaidToCounselor: false
    };

    if (counselorId) {
      sessionFilter.counselor = counselorId;
    }

    const sessions = await CounselingSession.find(sessionFilter)
      .populate('counselor', 'name email')
      .populate('employee', 'name')
      .sort({ counselor: 1, appointmentDate: 1 });

    // 상담사별로 그룹화
    const counselorSessions = {};
    sessions.forEach(session => {
      const counselorIdStr = session.counselor._id.toString();
      if (!counselorSessions[counselorIdStr]) {
        counselorSessions[counselorIdStr] = {
          counselor: session.counselor,
          sessions: []
        };
      }
      counselorSessions[counselorIdStr].sessions.push(session);
    });

    const createdPayments = [];

    // 각 상담사별 정산서 생성
    for (const counselorIdStr in counselorSessions) {
      const { counselor, sessions: counselorSessionList } = counselorSessions[counselorIdStr];

      // 이미 해당 월 정산서가 존재하는지 확인
      const existingPayment = await CounselorPayment.findOne({
        counselor: counselorIdStr,
        year,
        month
      });

      if (existingPayment) {
        continue; // 이미 존재하면 건너뛰기
      }

      // 세션별 상세 정보 생성
      const sessionDetails = counselorSessionList.map(session => ({
        sessionId: session._id,
        company: session.company,
        employeeName: session.employee.name,
        date: session.appointmentDate,
        method: session.counselingMethod,
        duration: session.duration,
        rate: session.counselorRate,
        amount: session.counselorRate
      }));

      // 집계 정보 계산
      const summary = {
        totalSessions: sessionDetails.length,
        faceToFaceSessions: sessionDetails.filter(s => s.method === 'faceToFace').length,
        phoneVideoSessions: sessionDetails.filter(s => s.method === 'phoneVideo').length,
        chatSessions: sessionDetails.filter(s => s.method === 'chat').length,
        totalAmount: sessionDetails.reduce((sum, s) => sum + s.amount, 0)
      };

      summary.taxAmount = Math.floor(summary.totalAmount * 0.1); // 10% 세금
      summary.netAmount = summary.totalAmount - summary.taxAmount;

      // 정산서 생성
      const payment = new CounselorPayment({
        counselor: counselorIdStr,
        year,
        month,
        sessions: sessionDetails,
        summary,
        status: 'pending'
      });

      await payment.save();

      // 세션들을 지급 대기 상태로 변경
      await CounselingSession.updateMany(
        { _id: { $in: sessionDetails.map(s => s.sessionId) } },
        { isPaidToCounselor: true }
      );

      createdPayments.push(payment);
    }

    res.json({
      message: `${year}년 ${month}월 정산서가 생성되었습니다.`,
      createdCount: createdPayments.length,
      payments: createdPayments
    });
  } catch (error) {
    console.error('정산서 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 정산 승인 (Super Admin용)
router.put('/:id/approve', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const payment = await CounselorPayment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: '정산 내역을 찾을 수 없습니다.' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: '대기 중인 정산만 승인할 수 있습니다.' });
    }

    payment.status = 'approved';
    payment.approvedBy = req.user._id;
    payment.approvedAt = new Date();
    if (notes) payment.notes = notes;

    await payment.save();

    const updatedPayment = await CounselorPayment.findById(id)
      .populate('counselor', 'name email')
      .populate('approvedBy', 'name');

    res.json({
      message: '정산이 승인되었습니다.',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('정산 승인 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 정산 지급 완료 처리 (Super Admin용)
router.put('/:id/pay', [auth, authorize(['super-admin'])], [
  body('paymentMethod').isIn(['bank_transfer', 'check', 'digital_wallet']).withMessage('유효한 지급 방법을 선택하세요.'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { paymentMethod, notes } = req.body;

    const payment = await CounselorPayment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: '정산 내역을 찾을 수 없습니다.' });
    }

    if (payment.status !== 'approved') {
      return res.status(400).json({ message: '승인된 정산만 지급 처리할 수 있습니다.' });
    }

    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.paymentMethod = paymentMethod;
    if (notes) payment.notes = (payment.notes || '') + '\n' + notes;

    await payment.save();

    res.json({
      message: '정산 지급이 완료되었습니다.',
      payment
    });
  } catch (error) {
    console.error('정산 지급 처리 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 정산 이의 제기 (상담사용)
router.put('/:id/dispute', [auth, authorize(['counselor'])], [
  body('reason').trim().isLength({ min: 10 }).withMessage('이의 제기 사유를 10자 이상 입력하세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const payment = await CounselorPayment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: '정산 내역을 찾을 수 없습니다.' });
    }

    // 본인의 정산만 이의 제기 가능
    const counselor = await Counselor.findOne({ email: req.user.email });
    if (!counselor || payment.counselor.toString() !== counselor._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    if (payment.status === 'paid') {
      return res.status(400).json({ message: '이미 지급된 정산은 이의 제기할 수 없습니다.' });
    }

    payment.status = 'dispute';
    payment.notes = (payment.notes || '') + `\n[이의제기] ${reason}`;

    await payment.save();

    res.json({
      message: '이의 제기가 접수되었습니다.',
      payment
    });
  } catch (error) {
    console.error('정산 이의 제기 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 정산 상태 변경 (Super Admin용)
router.put('/:id/status', [auth, authorize(['super-admin'])], [
  body('status').isIn(['pending', 'processing', 'settling', 'completed', 'dispute']).withMessage('유효한 상태를 선택하세요.'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const payment = await CounselorPayment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: '정산 내역을 찾을 수 없습니다.' });
    }

    const oldStatus = payment.status;
    payment.status = status;
    
    // 상태 변경에 따른 추가 처리
    if (status === 'completed' && oldStatus !== 'completed') {
      payment.paidAt = new Date();
    }
    
    if (notes) {
      payment.notes = (payment.notes || '') + `\n[상태변경] ${oldStatus} → ${status}: ${notes}`;
    } else {
      payment.notes = (payment.notes || '') + `\n[상태변경] ${oldStatus} → ${status}`;
    }

    await payment.save();

    const updatedPayment = await CounselorPayment.findById(id)
      .populate('counselor', 'name email')
      .populate('approvedBy', 'name');

    res.json({
      message: `정산 상태가 ${status}로 변경되었습니다.`,
      payment: updatedPayment
    });
  } catch (error) {
    console.error('정산 상태 변경 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 정산 명세서 다운로드
router.get('/:id/statement', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await CounselorPayment.findById(id)
      .populate('counselor', 'name email phone licenseNumber')
      .populate('approvedBy', 'name');

    if (!payment) {
      return res.status(404).json({ message: '정산 내역을 찾을 수 없습니다.' });
    }

    // 권한 확인
    if (req.user.role === 'counselor') {
      const counselor = await Counselor.findOne({ email: req.user.email });
      if (!counselor || payment.counselor._id.toString() !== counselor._id.toString()) {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
    } else if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // 정산 명세서 생성
    const statement = payment.generateStatement();

    res.json({
      statement,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('정산 명세서 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;