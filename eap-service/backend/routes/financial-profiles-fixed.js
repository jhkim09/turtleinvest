const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const FinancialProfile = require('../models/FinancialProfile');

// 재무 프로필을 가져오거나 생성하는 헬퍼 함수
const getOrCreateProfile = async (userId, advisorId = null) => {
  let profile = await FinancialProfile.findOne({ 
    user: userId, 
    isActive: true 
  });

  if (!profile) {
    profile = new FinancialProfile({
      user: userId,
      financialAdvisor: advisorId,
      currentAssets: { cash: 0, savings: 0, investments: 0, realEstate: 0, other: 0 },
      currentLiabilities: { creditCard: 0, loans: 0, mortgage: 0, other: 0 },
      monthlyIncome: { salary: 0, business: 0, investment: 0, other: 0 },
      monthlyExpenses: { living: 0, housing: 0, insurance: 0, education: 0, other: 0 },
      financialGoals: [],
      riskProfile: 'moderate',
      investmentExperience: 'beginner'
    });
    await profile.save();
  }

  return profile;
};

// GET /api/financial-profiles/:userId - 특정 사용자의 재무 프로필 조회
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 권한 확인: 본인이거나 재무상담사만 조회 가능
    if (req.user.id !== userId && req.user.role !== 'financial-advisor' && req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    // 프로필 가져오거나 생성
    const advisorId = req.user.role === 'financial-advisor' ? req.user.id : null;
    const profile = await getOrCreateProfile(userId, advisorId);
    
    await profile.populate('user financialAdvisor');
    res.json(profile);
  } catch (error) {
    console.error('재무 프로필 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/financial-profiles - 재무 프로필 생성/업데이트
router.post('/', auth, async (req, res) => {
  try {
    const { userId, ...profileData } = req.body;

    // 권한 확인: 재무상담사만 생성/업데이트 가능
    if (req.user.role !== 'financial-advisor' && req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '재무상담사만 프로필을 작성할 수 있습니다.' });
    }

    // 기존 프로필 찾기 또는 생성
    let profile = await getOrCreateProfile(userId, req.user.id);

    // 프로필 업데이트
    Object.assign(profile, profileData);
    profile.financialAdvisor = req.user.id;

    await profile.save();
    
    // populate하여 반환
    await profile.populate('user financialAdvisor');
    
    res.status(201).json(profile);
  } catch (error) {
    console.error('재무 프로필 저장 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// GET /api/financial-profiles - 재무상담사의 모든 클라이언트 프로필 조회
router.get('/', auth, async (req, res) => {
  try {
    // 재무상담사만 접근 가능
    if (req.user.role !== 'financial-advisor' && req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    const profiles = await FinancialProfile.find({ 
      financialAdvisor: req.user.id,
      isActive: true 
    }).populate('user', 'name email department')
      .sort({ updatedAt: -1 });

    res.json(profiles);
  } catch (error) {
    console.error('재무 프로필 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/financial-profiles/:id - 재무 프로필 삭제 (비활성화)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 재무상담사만 삭제 가능
    if (req.user.role !== 'financial-advisor' && req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    const profile = await FinancialProfile.findById(id);
    
    if (!profile) {
      return res.status(404).json({ message: '재무 프로필을 찾을 수 없습니다.' });
    }

    // 본인이 작성한 프로필인지 확인
    if (profile.financialAdvisor.toString() !== req.user.id && req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '해당 프로필을 삭제할 권한이 없습니다.' });
    }

    profile.isActive = false;
    await profile.save();

    res.json({ message: '재무 프로필이 삭제되었습니다.' });
  } catch (error) {
    console.error('재무 프로필 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// GET /api/financial-profiles/stats/overview - 재무상담사 통계
router.get('/stats/overview', auth, async (req, res) => {
  try {
    // 재무상담사만 접근 가능
    if (req.user.role !== 'financial-advisor' && req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    const totalClients = await FinancialProfile.countDocuments({ 
      financialAdvisor: req.user.id,
      isActive: true 
    });

    const profiles = await FinancialProfile.find({ 
      financialAdvisor: req.user.id,
      isActive: true 
    });

    // 평균 순자산 계산
    const avgNetWorth = profiles.length > 0 ? 
      profiles.reduce((sum, profile) => {
        const totalAssets = Object.values(profile.currentAssets).reduce((sum, val) => sum + (val || 0), 0);
        const totalLiabilities = Object.values(profile.currentLiabilities).reduce((sum, val) => sum + (val || 0), 0);
        return sum + (totalAssets - totalLiabilities);
      }, 0) / profiles.length : 0;

    // 위험성향 분포
    const riskDistribution = profiles.reduce((acc, profile) => {
      acc[profile.riskProfile] = (acc[profile.riskProfile] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalClients,
      avgNetWorth,
      riskDistribution,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('재무 프로필 통계 조회 오류:', error);
    res.status(500).json({ message: '서버 오러가 발생했습니다.' });
  }
});

// POST /api/financial-profiles/:userId/goals - 재무 목표 추가
router.post('/:userId/goals', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, targetAmount, targetDate, priority = 'medium' } = req.body;

    // 권한 확인: 본인이거나 재무상담사만 추가 가능
    if (req.user.id !== userId && req.user.role !== 'financial-advisor' && req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    // 프로필 가져오거나 생성
    const advisorId = req.user.role === 'financial-advisor' ? req.user.id : null;
    const profile = await getOrCreateProfile(userId, advisorId);

    const newGoal = {
      title,
      targetAmount,
      targetDate: new Date(targetDate),
      currentAmount: 0,
      priority,
      status: 'planning'
    };

    profile.financialGoals.push(newGoal);
    await profile.save();

    res.status(201).json(profile.financialGoals[profile.financialGoals.length - 1]);
  } catch (error) {
    console.error('재무 목표 추가 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/financial-profiles/:userId/goals/:goalId - 재무 목표 수정
router.put('/:userId/goals/:goalId', auth, async (req, res) => {
  try {
    const { userId, goalId } = req.params;
    const { title, targetAmount, targetDate, currentAmount, priority, status } = req.body;

    // 권한 확인: 본인이거나 재무상담사만 수정 가능
    if (req.user.id !== userId && req.user.role !== 'financial-advisor' && req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    // 프로필 가져오거나 생성
    const advisorId = req.user.role === 'financial-advisor' ? req.user.id : null;
    const profile = await getOrCreateProfile(userId, advisorId);

    const goal = profile.financialGoals.id(goalId);
    if (!goal) {
      return res.status(404).json({ message: '재무 목표를 찾을 수 없습니다.' });
    }

    // 목표 정보 업데이트
    if (title !== undefined) goal.title = title;
    if (targetAmount !== undefined) goal.targetAmount = targetAmount;
    if (targetDate !== undefined) goal.targetDate = new Date(targetDate);
    if (currentAmount !== undefined) goal.currentAmount = currentAmount;
    if (priority !== undefined) goal.priority = priority;
    if (status !== undefined) goal.status = status;

    await profile.save();

    res.json(goal);
  } catch (error) {
    console.error('재무 목표 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/financial-profiles/:userId/goals/:goalId - 재무 목표 삭제
router.delete('/:userId/goals/:goalId', auth, async (req, res) => {
  try {
    const { userId, goalId } = req.params;

    // 권한 확인: 본인이거나 재무상담사만 삭제 가능
    if (req.user.id !== userId && req.user.role !== 'financial-advisor' && req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    // 프로필 가져오거나 생성
    const advisorId = req.user.role === 'financial-advisor' ? req.user.id : null;
    const profile = await getOrCreateProfile(userId, advisorId);

    const goal = profile.financialGoals.id(goalId);
    if (!goal) {
      return res.status(404).json({ message: '재무 목표를 찾을 수 없습니다.' });
    }

    profile.financialGoals.pull(goalId);
    await profile.save();

    res.json({ message: '재무 목표가 삭제되었습니다.' });
  } catch (error) {
    console.error('재무 목표 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;