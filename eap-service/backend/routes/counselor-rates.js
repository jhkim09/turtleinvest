const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// 상담사 단가 목록 조회 (수퍼어드민 전용)
router.get('/rates', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    const counselors = await User.find({ role: 'counselor' })
      .select('name email customRate useSystemRate isActive')
      .sort({ name: 1 });

    res.json({
      counselors: counselors.map(counselor => ({
        id: counselor._id,
        name: counselor.name,
        email: counselor.email,
        customRate: counselor.customRate || 0,
        useSystemRate: counselor.useSystemRate,
        isActive: counselor.isActive
      }))
    });
  } catch (error) {
    console.error('상담사 단가 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 상담사 단가 업데이트 (수퍼어드민 전용)
router.patch('/rates/:counselorId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    const { counselorId } = req.params;
    const { customRate, useSystemRate } = req.body;

    // 입력값 검증
    if (typeof useSystemRate !== 'boolean') {
      return res.status(400).json({ error: '시스템 단가 사용 여부는 필수입니다.' });
    }

    if (!useSystemRate && (!customRate || customRate < 0)) {
      return res.status(400).json({ error: '개별 단가는 0 이상이어야 합니다.' });
    }

    const updateData = {
      useSystemRate,
      ...(useSystemRate ? {} : { customRate: Number(customRate) })
    };

    const counselor = await User.findOneAndUpdate(
      { _id: counselorId, role: 'counselor' },
      updateData,
      { new: true, runValidators: true }
    ).select('name email customRate useSystemRate');

    if (!counselor) {
      return res.status(404).json({ error: '상담사를 찾을 수 없습니다.' });
    }

    res.json({
      success: true,
      counselor: {
        id: counselor._id,
        name: counselor.name,
        email: counselor.email,
        customRate: counselor.customRate || 0,
        useSystemRate: counselor.useSystemRate
      }
    });
  } catch (error) {
    console.error('상담사 단가 업데이트 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 상담사 개별 단가 조회
router.get('/rate/:counselorId', auth, async (req, res) => {
  try {
    const { counselorId } = req.params;

    const counselor = await User.findOne({ 
      _id: counselorId, 
      role: 'counselor' 
    }).select('customRate useSystemRate');

    if (!counselor) {
      return res.status(404).json({ error: '상담사를 찾을 수 없습니다.' });
    }

    // 시스템 기본 단가 조회 (필요시)
    const systemRate = 50000; // 기본값, 실제로는 설정에서 가져와야 함

    const effectiveRate = counselor.useSystemRate ? systemRate : counselor.customRate;

    res.json({
      counselorId: counselor._id,
      customRate: counselor.customRate || 0,
      useSystemRate: counselor.useSystemRate,
      effectiveRate,
      systemRate
    });
  } catch (error) {
    console.error('상담사 단가 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;