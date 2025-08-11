const express = require('express');
const { body, validationResult } = require('express-validator');
const CounselingSession = require('../models/CounselingSession');
const Counselor = require('../models/Counselor');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 상담 세션 목록 조회
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, assignmentStatus } = req.query;
    let filter = {};

    // 역할별 필터링
    if (req.user.role === 'employee') {
      filter.employee = req.user._id;
    } else if (req.user.role === 'counselor') {
      filter.counselor = req.user._id;
    } else if (req.user.role === 'manager') {
      // 매니저는 자신의 부서 직원들의 세션만 볼 수 있음 (개인정보 제외)
      const departmentEmployees = await User.find({ 
        department: req.user.department, 
        role: 'employee' 
      }).select('_id');
      filter.employee = { $in: departmentEmployees.map(emp => emp._id) };
    } else if (req.user.role === 'company-admin') {
      // 회사 관리자는 회사 내 모든 세션 볼 수 있음 (개인정보 제외)
      // 실제로는 회사 정보로 필터링해야 하지만 여기서는 단순화
    }

    if (status) filter.status = status;
    if (assignmentStatus) filter.assignmentStatus = assignmentStatus;

    const sessions = await CounselingSession.find(filter)
      .populate('employee', 'name email department')
      .populate('counselor', 'name specialties')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // 개인정보 보호를 위한 필터링
    const filteredSessions = sessions.map(session => {
      const sessionObj = session.toObject();
      
      // 직원과 상담사, Super Admin만 상세 내용 볼 수 있음
      if (!session.canViewDetails(req.user._id, req.user.role)) {
        delete sessionObj.sessionNotes;
        delete sessionObj.recommendations;
        // 매니저나 회사 관리자는 주제도 일반화
        if (['manager', 'company-admin'].includes(req.user.role)) {
          sessionObj.topic = '상담 완료';
        }
      }
      
      return sessionObj;
    });

    const total = await CounselingSession.countDocuments(filter);

    res.json({
      sessions: filteredSessions,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('상담 세션 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 배정 대기 중인 상담 요청 조회 (Super Admin용)
router.get('/pending-assignments', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const pendingSessions = await CounselingSession.find({
      assignmentStatus: 'pending'
    })
      .populate('employee', 'name email department')
      .sort({ createdAt: 1, urgencyLevel: -1 });

    res.json(pendingSessions);
  } catch (error) {
    console.error('대기 중인 배정 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 자동 상담사 배정 함수
const autoAssignCounselor = async (session) => {
  try {
    // 활성 상담사 중에서 최소 세션 수를 가진 상담사 찾기
    const counselors = await User.find({ 
      role: 'counselor', 
      isActive: true 
    }).select('_id name customRate useSystemRate');

    if (counselors.length === 0) {
      return null; // 사용할 수 있는 상담사가 없음
    }

    // 단순하게 첫 번째 상담사 배정 (실제로는 더 복잡한 로직 가능)
    const assignedCounselor = counselors[0];
    
    // 상담사별 단가 적용
    const systemRate = 50000; // 시스템 기본 단가
    const effectiveRate = assignedCounselor.useSystemRate 
      ? systemRate 
      : (assignedCounselor.customRate || systemRate);
    
    session.counselor = assignedCounselor._id;
    session.assignmentStatus = 'assigned';
    session.counselorRate = effectiveRate;
    
    await session.save();
    return assignedCounselor;
  } catch (error) {
    console.error('자동 상담사 배정 오류:', error);
    return null;
  }
};

// 상담 세션 생성 (직원용)
router.post('/', [auth, authorize(['employee'])], [
  body('topic').trim().isLength({ min: 1 }).withMessage('상담 주제를 선택하세요.'),
  body('counselingMethod').optional().isIn(['faceToFace', 'phoneVideo', 'chat']),
  body('sessionType').optional().isIn(['individual', 'group', 'family', 'crisis']),
  body('urgencyLevel').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('appointmentDate').isISO8601().withMessage('유효한 날짜를 입력하세요.'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      topic,
      counselingMethod = 'faceToFace',
      sessionType = 'individual',
      urgencyLevel = 'medium',
      appointmentDate,
      notes
    } = req.body;

    // 회사 정보 가져오기 (실제로는 User 모델에서)
    const employee = await User.findById(req.user._id);
    const company = employee.company || 'Default Company';

    const session = new CounselingSession({
      employee: req.user._id,
      company,
      topic,
      counselingMethod,
      sessionType,
      urgencyLevel,
      appointmentDate: new Date(appointmentDate),
      assignmentStatus: 'pending',
      status: 'scheduled',
      counselorRate: 0
    });

    // 추가 메모가 있으면 저장
    if (notes) {
      session.sessionNotes = `직원 요청사항: ${notes}`;
    }

    await session.save();

    // 자동 상담사 배정 시도
    const assignedCounselor = await autoAssignCounselor(session);

    // 세션 재조회 (상담사 정보 포함)
    const populatedSession = await CounselingSession.findById(session._id)
      .populate('employee', 'name email department')
      .populate('counselor', 'name email');

    const message = assignedCounselor 
      ? `상담 요청이 접수되었습니다. ${assignedCounselor.name} 상담사가 배정되었습니다.`
      : '상담 요청이 접수되었습니다. 상담사 배정까지 잠시만 기다려주세요.';

    res.status(201).json({
      message,
      session: populatedSession
    });
  } catch (error) {
    console.error('상담 세션 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 상담사 배정 (Super Admin용)
router.put('/:id/assign', [auth, authorize(['super-admin'])], [
  body('counselorId').isMongoId().withMessage('유효한 상담사를 선택하세요.'),
  body('assignmentNotes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { counselorId, assignmentNotes } = req.body;

    const session = await CounselingSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: '상담 세션을 찾을 수 없습니다.' });
    }

    if (session.assignmentStatus !== 'pending') {
      return res.status(400).json({ message: '이미 배정된 상담입니다.' });
    }

    const counselor = await Counselor.findById(counselorId);
    if (!counselor || !counselor.isActive) {
      return res.status(400).json({ message: '유효하지 않은 상담사입니다.' });
    }

    // 상담사 단가 설정
    let counselorRate = 0;
    switch (session.counselingMethod) {
      case 'faceToFace':
        counselorRate = counselor.rates.faceToFace;
        break;
      case 'phoneVideo':
        counselorRate = counselor.rates.phoneVideo;
        break;
      case 'chat':
        counselorRate = counselor.rates.chat;
        break;
    }

    // 세션 업데이트
    session.counselor = counselorId;
    session.assignedBy = req.user._id;
    session.assignmentStatus = 'assigned';
    session.assignmentNotes = assignmentNotes;
    session.counselorRate = counselorRate;

    await session.save();

    const updatedSession = await CounselingSession.findById(id)
      .populate('employee', 'name email department')
      .populate('counselor', 'name specialties')
      .populate('assignedBy', 'name');

    res.json({
      message: '상담사가 성공적으로 배정되었습니다.',
      session: updatedSession
    });
  } catch (error) {
    console.error('상담사 배정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 상담 세션 상태 업데이트
router.put('/:id/status', [auth], [
  body('status').isIn(['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show']).withMessage('유효한 상태를 선택하세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const session = await CounselingSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: '상담 세션을 찾을 수 없습니다.' });
    }

    // 상담사나 Super Admin만 상태 변경 가능
    if (req.user.role !== 'super-admin' && 
        (req.user.role !== 'counselor' || session.counselor.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    session.status = status;

    // 완료 시 상담사 통계 업데이트
    if (status === 'completed') {
      await Counselor.findByIdAndUpdate(session.counselor, {
        $inc: { totalSessions: 1 }
      });
    }

    await session.save();

    res.json({
      message: '상담 상태가 업데이트되었습니다.',
      session
    });
  } catch (error) {
    console.error('상담 상태 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 상담 기록 작성/수정 (상담사용)
router.put('/:id/notes', [auth, authorize(['counselor'])], [
  body('sessionNotes').optional().trim(),
  body('recommendations').optional().trim(),
  body('followUpRequired').optional().isBoolean()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionNotes, recommendations, followUpRequired } = req.body;

    const session = await CounselingSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: '상담 세션을 찾을 수 없습니다.' });
    }

    // 담당 상담사만 기록 작성 가능
    if (session.counselor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '담당 상담사만 기록을 작성할 수 있습니다.' });
    }

    const updateFields = {};
    if (sessionNotes !== undefined) updateFields.sessionNotes = sessionNotes;
    if (recommendations !== undefined) updateFields.recommendations = recommendations;
    if (followUpRequired !== undefined) updateFields.followUpRequired = followUpRequired;

    const updatedSession = await CounselingSession.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    ).populate('employee', 'name email').populate('counselor', 'name');

    res.json({
      message: '상담 기록이 저장되었습니다.',
      session: updatedSession
    });
  } catch (error) {
    console.error('상담 기록 저장 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 평가 작성 (직원용)
router.put('/:id/rating', [auth, authorize(['employee'])], [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('평점은 1-5 사이여야 합니다.'),
  body('feedback').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { rating, feedback } = req.body;

    const session = await CounselingSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: '상담 세션을 찾을 수 없습니다.' });
    }

    // 본인의 세션만 평가 가능
    if (session.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '본인의 상담만 평가할 수 있습니다.' });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({ message: '완료된 상담만 평가할 수 있습니다.' });
    }

    session.rating = rating;
    if (feedback) session.feedback = feedback;

    await session.save();

    // 상담사 평점 업데이트
    const counselor = await Counselor.findById(session.counselor);
    if (counselor) {
      const newTotalRatings = counselor.totalRatings + 1;
      const newRating = ((counselor.rating * counselor.totalRatings) + rating) / newTotalRatings;
      
      counselor.rating = Math.round(newRating * 10) / 10; // 소수점 1자리
      counselor.totalRatings = newTotalRatings;
      await counselor.save();
    }

    res.json({
      message: '평가가 등록되었습니다.',
      session
    });
  } catch (error) {
    console.error('평가 등록 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 상담사별 세션 조회 (수퍼어드민용)
router.get('/counselor/:counselorId/sessions', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const { counselorId } = req.params;
    const { period } = req.query; // 예: "2024-08" 또는 "all"

    // 상담사 존재 확인
    const counselor = await User.findById(counselorId);
    if (!counselor || counselor.role !== 'counselor') {
      return res.status(404).json({
        success: false,
        message: '상담사를 찾을 수 없습니다.'
      });
    }

    // 기간 필터링 조건 설정
    let dateFilter = {};
    if (period && period !== 'all') {
      const [year, month] = period.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      
      dateFilter = {
        appointmentDate: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    // 세션 조회
    const sessions = await CounselingSession.find({
      counselor: counselorId,
      ...dateFilter
    })
    .populate('employee', 'name email company')
    .populate('counselor', 'name email')
    .sort({ appointmentDate: -1 }); // 최신순 정렬

    // 응답용 데이터 가공
    const sessionData = sessions.map(session => ({
      id: session._id,
      date: session.appointmentDate.toISOString().split('T')[0],
      time: session.appointmentDate.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      client: session.employee?.name || '알 수 없음',
      company: session.employee?.company || session.company,
      topic: session.topic,
      status: session.status,
      duration: session.duration,
      fee: session.counselorRate,
      notes: session.sessionNotes || (session.status === 'scheduled' ? '예정된 상담' : '상담 완료'),
      sessionType: session.sessionType,
      counselingMethod: session.counselingMethod,
      urgencyLevel: session.urgencyLevel,
      rating: session.rating
    }));

    // 통계 정보 계산
    const totalSessions = sessionData.length;
    const completedSessions = sessionData.filter(s => s.status === 'completed').length;
    const scheduledSessions = sessionData.filter(s => s.status === 'scheduled').length;
    const totalRevenue = sessionData.reduce((sum, s) => sum + (s.fee || 0), 0);

    res.json({
      success: true,
      counselor: {
        id: counselor._id,
        name: counselor.name,
        email: counselor.email
      },
      period: period === 'all' ? '전체 기간' : period,
      statistics: {
        totalSessions,
        completedSessions,
        scheduledSessions,
        totalRevenue
      },
      sessions: sessionData
    });

  } catch (error) {
    console.error('상담사 세션 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 상담사별 정산 요약 정보 조회 (수퍼어드민용)
router.get('/counselor/:counselorId/settlement-summary', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const { counselorId } = req.params;
    const { period } = req.query;

    // 상담사 정보 조회
    const counselor = await User.findById(counselorId);
    if (!counselor || counselor.role !== 'counselor') {
      return res.status(404).json({
        success: false,
        message: '상담사를 찾을 수 없습니다.'
      });
    }

    // 기간 필터
    let dateFilter = {};
    if (period && period !== 'all') {
      const [year, month] = period.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      
      dateFilter = {
        appointmentDate: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    // 완료된 세션만 정산 대상
    const completedSessions = await CounselingSession.find({
      counselor: counselorId,
      status: 'completed',
      ...dateFilter
    });

    // 정산 계산
    const totalSessions = completedSessions.length;
    const totalRevenue = completedSessions.reduce((sum, session) => sum + (session.counselorRate || 0), 0);
    const taxRate = counselor.taxRate || 0.033; // 기본 3.3%
    const tax = Math.floor(totalRevenue * taxRate);
    const netAmount = totalRevenue - tax;

    res.json({
      success: true,
      counselor: {
        id: counselor._id,
        name: counselor.name,
        email: counselor.email,
        isIndependent: counselor.isIndependent || false,
        counselingCenter: counselor.counselingCenter
      },
      period: period === 'all' ? '전체 기간' : period,
      settlement: {
        totalSessions,
        totalRevenue,
        taxRate: taxRate * 100, // 퍼센트로 표시
        tax,
        netAmount,
        averagePerSession: totalSessions > 0 ? Math.floor(totalRevenue / totalSessions) : 0
      }
    });

  } catch (error) {
    console.error('상담사 정산 요약 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 이의제기 제출 API
router.post('/:id/dispute', [auth, authorize(['counselor', 'super-admin'])], [
  body('reason').trim().isLength({ min: 1 }).withMessage('이의제기 사유를 입력하세요.'),
  body('disputeType').optional().isIn(['payment', 'session', 'rating', 'other']),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { reason, disputeType = 'payment', description } = req.body;

    const session = await CounselingSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: '상담 세션을 찾을 수 없습니다.' });
    }

    // 상담사나 Super Admin만 이의제기 가능
    if (req.user.role !== 'super-admin' && 
        (req.user.role !== 'counselor' || session.counselor.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // 이미 이의제기가 진행중인지 확인
    if (session.disputeStatus && session.disputeStatus !== 'resolved') {
      return res.status(400).json({ message: '이미 이의제기가 진행 중입니다.' });
    }

    // 이의제기 정보 업데이트
    session.disputeStatus = 'pending';
    session.disputeReason = reason;
    session.disputeType = disputeType;
    session.disputeDescription = description;
    session.disputeSubmittedBy = req.user._id;
    session.disputeSubmittedAt = new Date();

    await session.save();

    const updatedSession = await CounselingSession.findById(id)
      .populate('employee', 'name email')
      .populate('counselor', 'name email')
      .populate('disputeSubmittedBy', 'name email');

    res.json({
      success: true,
      message: '이의제기가 성공적으로 제출되었습니다.',
      session: updatedSession
    });

  } catch (error) {
    console.error('이의제기 제출 오류:', error);
    res.status(500).json({ 
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 이의제기 상태 변경 API (Super Admin용)
router.put('/:id/dispute-status', [auth, authorize(['super-admin'])], [
  body('status').isIn(['pending', 'reviewing', 'resolved', 'rejected']).withMessage('유효한 상태를 선택하세요.'),
  body('resolution').optional().trim(),
  body('adminNotes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, resolution, adminNotes } = req.body;

    const session = await CounselingSession.findById(id);
    if (!session) {
      return res.status(404).json({ message: '상담 세션을 찾을 수 없습니다.' });
    }

    if (!session.disputeStatus) {
      return res.status(400).json({ message: '이의제기가 제기되지 않은 세션입니다.' });
    }

    session.disputeStatus = status;
    session.disputeResolvedBy = req.user._id;
    session.disputeResolvedAt = new Date();
    
    if (resolution) session.disputeResolution = resolution;
    if (adminNotes) session.disputeAdminNotes = adminNotes;

    await session.save();

    const updatedSession = await CounselingSession.findById(id)
      .populate('employee', 'name email')
      .populate('counselor', 'name email')
      .populate('disputeSubmittedBy', 'name email')
      .populate('disputeResolvedBy', 'name email');

    res.json({
      success: true,
      message: `이의제기 상태가 변경되었습니다.`,
      session: updatedSession
    });

  } catch (error) {
    console.error('이의제기 상태 변경 오류:', error);
    res.status(500).json({ 
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 이의제기 목록 조회 API (Super Admin용)
router.get('/disputes', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let filter = { disputeStatus: { $exists: true, $ne: null } };
    if (status) filter.disputeStatus = status;

    const disputes = await CounselingSession.find(filter)
      .populate('employee', 'name email company')
      .populate('counselor', 'name email')
      .populate('disputeSubmittedBy', 'name email')
      .populate('disputeResolvedBy', 'name email')
      .sort({ disputeSubmittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CounselingSession.countDocuments(filter);

    res.json({
      success: true,
      disputes,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('이의제기 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;