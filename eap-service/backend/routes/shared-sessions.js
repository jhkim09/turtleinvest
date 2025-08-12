const express = require('express');
const router = express.Router();
const CounselingSession = require('../models/CounselingSession');
const FinancialSession = require('../models/FinancialSession');
const { auth } = require('../middleware/auth');

// 직원과 상담사 간 공유되는 세션 데이터 조회
router.get('/shared/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { sessionType } = req.query; // 'counseling' or 'financial'
    
    let session;
    let Model = sessionType === 'financial' ? FinancialSession : CounselingSession;
    
    if (sessionType === 'financial') {
      session = await FinancialSession.findById(sessionId)
        .populate('client', 'name email department')
        .populate('financialAdvisor', 'name email');
    } else {
      session = await CounselingSession.findById(sessionId)
        .populate('employee', 'name email department')
        .populate('counselor', 'name email');
    }
    
    if (!session) {
      return res.status(404).json({ message: '세션을 찾을 수 없습니다.' });
    }
    
    // 접근 권한 확인
    const isClient = sessionType === 'financial' ? 
      session.client.toString() === req.user._id.toString() :
      session.employee.toString() === req.user._id.toString();
      
    const isAdvisor = sessionType === 'financial' ?
      session.financialAdvisor.toString() === req.user._id.toString() :
      session.counselor.toString() === req.user._id.toString();
    
    const isAdmin = req.user.role === 'super-admin' || req.user.role === 'company-admin';
    
    if (!isClient && !isAdvisor && !isAdmin) {
      return res.status(403).json({ message: '이 세션에 접근할 권한이 없습니다.' });
    }
    
    // 🔓 공유 데이터만 반환 (직원이 볼 수 있는 데이터)
    const sharedData = {
      _id: session._id,
      sessionType: sessionType,
      scheduledDate: session.scheduledDate || session.appointmentDate,
      duration: session.duration,
      status: session.status,
      client: sessionType === 'financial' ? session.client : session.employee,
      advisor: sessionType === 'financial' ? session.financialAdvisor : session.counselor,
      
      // 공유 가능한 세션 내용만 포함
      sharedContent: session.sessionRecord?.sharedContent || {},
      
      // 기본 정보들
      materialsProvided: session.materialsProvided || [],
      clientFeedback: session.clientFeedback || {}
    };
    
    res.json(sharedData);
  } catch (error) {
    console.error('공유 세션 데이터 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 상담사용 전체 세션 데이터 조회 (비공유 데이터 포함)
router.get('/full/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { sessionType } = req.query;
    
    // 상담사만 접근 가능
    if (!['counselor', 'financial-advisor', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: '전체 세션 데이터에 접근할 권한이 없습니다.' });
    }
    
    let session;
    
    if (sessionType === 'financial') {
      session = await FinancialSession.findById(sessionId)
        .populate('client', 'name email department')
        .populate('financialAdvisor', 'name email');
        
      // 담당 재무상담사인지 확인
      if (req.user.role === 'financial-advisor' && 
          session.financialAdvisor.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: '이 세션의 담당 상담사가 아닙니다.' });
      }
    } else {
      session = await CounselingSession.findById(sessionId)
        .populate('employee', 'name email department')
        .populate('counselor', 'name email');
        
      // 담당 상담사인지 확인
      if (req.user.role === 'counselor' && 
          session.counselor.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: '이 세션의 담당 상담사가 아닙니다.' });
      }
    }
    
    if (!session) {
      return res.status(404).json({ message: '세션을 찾을 수 없습니다.' });
    }
    
    // 🔓🔒 전체 데이터 반환 (공유 + 비공유)
    res.json(session);
  } catch (error) {
    console.error('전체 세션 데이터 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 직원의 모든 세션 목록 조회 (공유 데이터만)
router.get('/my-sessions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'employee') {
      return res.status(403).json({ message: '직원만 접근할 수 있습니다.' });
    }
    
    const { page = 1, limit = 10 } = req.query;
    
    // 심리상담 세션들
    const counselingSessions = await CounselingSession.find({
      employee: req.user._id
    })
    .populate('counselor', 'name email')
    .select('appointmentDate duration status topic sessionRecord.sharedContent')
    .sort({ appointmentDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    // 재무상담 세션들
    const financialSessions = await FinancialSession.find({
      client: req.user._id
    })
    .populate('financialAdvisor', 'name email')
    .select('scheduledDate duration status sessionType sessionRecord.sharedContent')
    .sort({ scheduledDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    // 세션 타입 태그 추가
    const formattedCounselingSessions = counselingSessions.map(session => ({
      ...session.toObject(),
      sessionCategory: 'psychological',
      advisor: session.counselor
    }));
    
    const formattedFinancialSessions = financialSessions.map(session => ({
      ...session.toObject(),
      sessionCategory: 'financial',
      advisor: session.financialAdvisor,
      appointmentDate: session.scheduledDate // 일관된 필드명 사용
    }));
    
    // 모든 세션을 날짜순으로 정렬
    const allSessions = [...formattedCounselingSessions, ...formattedFinancialSessions]
      .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
    
    res.json({
      sessions: allSessions,
      total: allSessions.length,
      counselingCount: counselingSessions.length,
      financialCount: financialSessions.length
    });
  } catch (error) {
    console.error('직원 세션 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 공유 데이터 업데이트 (직원과 상담사 모두 가능)
router.put('/shared/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { sessionType, sharedContent } = req.body;
    
    let session;
    let Model = sessionType === 'financial' ? FinancialSession : CounselingSession;
    
    session = await Model.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: '세션을 찾을 수 없습니다.' });
    }
    
    // 접근 권한 확인
    const isClient = sessionType === 'financial' ? 
      session.client.toString() === req.user._id.toString() :
      session.employee.toString() === req.user._id.toString();
      
    const isAdvisor = sessionType === 'financial' ?
      session.financialAdvisor.toString() === req.user._id.toString() :
      session.counselor.toString() === req.user._id.toString();
    
    if (!isClient && !isAdvisor && req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '이 세션을 수정할 권한이 없습니다.' });
    }
    
    // 공유 데이터만 업데이트
    if (!session.sessionRecord) {
      session.sessionRecord = {};
    }
    
    session.sessionRecord.sharedContent = {
      ...session.sessionRecord.sharedContent,
      ...sharedContent
    };
    
    await session.save();
    
    res.json({ message: '공유 데이터가 업데이트되었습니다.', session });
  } catch (error) {
    console.error('공유 데이터 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;