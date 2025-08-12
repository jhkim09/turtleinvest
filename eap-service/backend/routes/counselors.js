const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Counselor = require('../models/Counselor');
const User = require('../models/User');
const CounselingCenter = require('../models/CounselingCenter');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 상담사 목록 조회 (Super Admin용)
router.get('/', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const filter = {};
    
    if (typeof isActive !== 'undefined') {
      filter.isActive = isActive === 'true';
    }

    console.log('상담사 목록 조회 요청');
    console.log('필터:', filter);
    console.log('페이지:', page, '제한:', limit);

    // User 모델에서 상담사 role을 가진 사용자들 조회 (심리상담사 + 재무상담사)
    const query = { 
      role: { $in: ['counselor', 'financial-advisor'] }, 
      ...filter 
    };
    console.log('MongoDB 쿼리:', query);

    const counselors = await User.find(query)
      .select('-password')
      .populate('counselingCenter', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    console.log(`조회된 상담사 수: ${counselors.length}`);
    counselors.forEach((counselor, index) => {
      console.log(`${index + 1}. ${counselor.name} (${counselor.role})`);
    });

    const total = await User.countDocuments(query);
    console.log('전체 상담사 수:', total);

    res.json({
      counselors,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('상담사 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 활성 상담사 목록 조회 (일반 사용자용)
router.get('/active', auth, async (req, res) => {
  try {
    const counselors = await User.find({ role: 'counselor', isActive: true })
      .select('name isIndependent counselingCenter customRate')
      .populate('counselingCenter', 'name')
      .sort({ createdAt: -1 });
    
    res.json(counselors);
  } catch (error) {
    console.error('활성 상담사 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 상담사 상세 조회
router.get('/:id', [auth, authorize(['super-admin', 'counselor'])], async (req, res) => {
  try {
    const { id } = req.params;
    
    // 본인 또는 Super Admin만 조회 가능
    if (req.user.role !== 'super-admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const counselor = await User.findById(id).select('-password').populate('counselingCenter', 'name');
    if (!counselor) {
      return res.status(404).json({ message: '상담사를 찾을 수 없습니다.' });
    }

    res.json(counselor);
  } catch (error) {
    console.error('상담사 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 상담사 등록 (Super Admin용)
router.post('/', [auth, authorize(['super-admin'])], [
  body('name').trim().isLength({ min: 2 }).withMessage('이름은 2자 이상이어야 합니다.'),
  body('email').isEmail().normalizeEmail().withMessage('유효한 이메일을 입력하세요.'),
  body('phone').optional().isMobilePhone('ko-KR').withMessage('유효한 전화번호를 입력하세요.'),
  body('password').isLength({ min: 6 }).withMessage('비밀번호는 6자 이상이어야 합니다.'),
  body('customRate').optional().isInt({ min: 0 }).withMessage('상담 단가는 0 이상이어야 합니다.'),
  body('taxRate').optional().isIn([3.3, 10]).withMessage('세금률은 3.3% 또는 10%여야 합니다.'),
  body('isIndependent').optional().isBoolean().withMessage('개인자격 여부는 true/false여야 합니다.'),
  body('counselingCenterId').optional().isMongoId().withMessage('유효한 상담센터 ID여야 합니다.'),
  body('role').optional().isIn(['counselor', 'financial-advisor']).withMessage('역할은 counselor 또는 financial-advisor여야 합니다.')
], async (req, res) => {
  try {
    console.log('상담사 등록 요청 데이터:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation 오류:', errors.array());
      return res.status(400).json({ 
        message: '입력 데이터 검증 실패', 
        errors: errors.array() 
      });
    }

    const {
      name, email, phone, password, 
      counselingCenterId, isIndependent = true,
      customRate, useSystemRate = true, taxRate = 3.3,
      role = 'counselor'
    } = req.body;

    // 이메일 중복 체크 (User 모델에서)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: '이미 등록된 이메일입니다.' });
    }

    // 상담센터 검증 (지정된 경우)
    let counselingCenter = null;
    if (counselingCenterId && !isIndependent) {
      counselingCenter = await CounselingCenter.findById(counselingCenterId);
      if (!counselingCenter) {
        return res.status(400).json({ message: '유효하지 않은 상담센터입니다.' });
      }
      
      // 센터 최대 상담사 수 확인
      if (counselingCenter.counselors.length >= counselingCenter.settings.maxCounselors) {
        return res.status(400).json({ 
          message: `상담센터 최대 상담사 수(${counselingCenter.settings.maxCounselors}명)를 초과했습니다.` 
        });
      }
    }

    const counselor = new User({
      name,
      email,
      phone,
      password,
      role,
      counselingCenter: (!isIndependent && counselingCenterId) ? counselingCenterId : undefined,
      isIndependent,
      customRate,
      useSystemRate,
      taxRate,
      isActive: true
    });

    await counselor.save();

    // 상담센터에 상담사 추가
    if (counselingCenter) {
      counselingCenter.counselors.push(counselor._id);
      await counselingCenter.save();
    }

    // 응답에서 populate 처리
    await counselor.populate('counselingCenter', 'name');

    res.status(201).json({
      message: '상담사가 성공적으로 등록되었습니다.',
      counselor: {
        id: counselor._id,
        name: counselor.name,
        email: counselor.email,
        phone: counselor.phone,
        role: counselor.role,
        isIndependent: counselor.isIndependent,
        counselingCenter: counselor.counselingCenter,
        customRate: counselor.customRate,
        useSystemRate: counselor.useSystemRate,
        taxRate: counselor.taxRate,
        isActive: counselor.isActive
      }
    });
  } catch (error) {
    console.error('상담사 등록 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 상담사 정보 수정
router.put('/:id', [auth, authorize(['super-admin', 'counselor'])], async (req, res) => {
  try {
    const { id } = req.params;
    
    // ObjectId 유효성 검증
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: '유효하지 않은 상담사 ID입니다.' });
    }
    
    // 본인 또는 Super Admin만 수정 가능
    if (req.user.role !== 'super-admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const updateFields = {};
    const allowedFields = ['name', 'phone', 'specialties', 'rates', 'maxDailyAppointments', 'customRate', 'taxRate'];
    const superAdminFields = ['isActive', 'experience', 'counselingCenter', 'isIndependent', 'role', 'counselingCenterId'];

    // 일반 필드 업데이트
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    // Super Admin 전용 필드
    if (req.user.role === 'super-admin') {
      superAdminFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'counselingCenterId') {
            // counselingCenterId는 counselingCenter로 매핑
            updateFields['counselingCenter'] = req.body[field] || undefined;
          } else {
            updateFields[field] = req.body[field];
          }
        }
      });
    }

    const counselor = await User.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password').populate('counselingCenter', 'name');

    if (!counselor) {
      return res.status(404).json({ message: '상담사를 찾을 수 없습니다.' });
    }

    res.json(counselor);
  } catch (error) {
    console.error('상담사 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 상담사 활성화/비활성화 (Super Admin용)
router.patch('/:id/status', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const counselor = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password').populate('counselingCenter', 'name');

    if (!counselor) {
      return res.status(404).json({ message: '상담사를 찾을 수 없습니다.' });
    }

    res.json({
      message: `상담사가 ${isActive ? '활성화' : '비활성화'}되었습니다.`,
      counselor
    });
  } catch (error) {
    console.error('상담사 상태 변경 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 상담사 통계 조회
router.get('/:id/stats', [auth, authorize(['super-admin', 'counselor'])], async (req, res) => {
  try {
    const { id } = req.params;
    
    // 본인 또는 Super Admin만 조회 가능
    if (req.user.role !== 'super-admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const counselor = await User.findById(id);
    if (!counselor) {
      return res.status(404).json({ message: '상담사를 찾을 수 없습니다.' });
    }

    // 실제로는 CounselingSession에서 통계를 계산해야 하지만, 
    // 여기서는 간단한 통계만 반환
    const stats = {
      totalSessions: counselor.totalSessions || 0,
      rating: counselor.rating || 0,
      totalRatings: counselor.totalRatings || 0,
      monthlyStats: {
        // 월별 세션 통계는 추후 구현
        thisMonth: Math.floor((counselor.totalSessions || 0) * 0.1),
        lastMonth: Math.floor((counselor.totalSessions || 0) * 0.08)
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('상담사 통계 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;