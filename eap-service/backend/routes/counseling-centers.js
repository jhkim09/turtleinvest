const express = require('express');
const router = express.Router();
const CounselingCenter = require('../models/CounselingCenter');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// 모든 라우트에 인증 미들웨어 적용
router.use(auth);

// 상담센터 목록 조회 (수퍼어드민만 가능)
router.get('/', async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const centers = await CounselingCenter.find()
      .populate('adminUser', 'name email')
      .populate('counselors', 'name email isActive')
      .sort({ createdAt: -1 });

    const centersWithStats = centers.map(center => ({
      ...center.toObject(),
      activeCounselor: center.counselors?.filter(c => c.isActive).length || 0,
      totalCounselors: center.counselors?.length || 0
    }));

    res.json({
      success: true,
      centers: centersWithStats
    });
  } catch (error) {
    console.error('상담센터 목록 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 상담센터 상세 조회
router.get('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const center = await CounselingCenter.findById(req.params.id)
      .populate('adminUser', 'name email phone')
      .populate('counselors', 'name email phone specialties experience isActive totalSessions rating');

    if (!center) {
      return res.status(404).json({ 
        success: false, 
        message: '상담센터를 찾을 수 없습니다.' 
      });
    }

    res.json({
      success: true,
      center: center
    });
  } catch (error) {
    console.error('상담센터 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 새 상담센터 생성
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const {
      name,
      description,
      adminUserEmail,
      businessLicense,
      address,
      contact,
      specialties,
      operatingHours,
      settings
    } = req.body;

    // 관리자 사용자 확인
    let adminUser = null;
    if (adminUserEmail) {
      adminUser = await User.findOne({ 
        email: adminUserEmail, 
        role: { $in: ['counselor', 'super-admin'] }
      });
      if (!adminUser) {
        return res.status(400).json({ 
          success: false, 
          message: '유효한 관리자 사용자를 찾을 수 없습니다.' 
        });
      }
    }

    const centerData = {
      name,
      description,
      businessLicense,
      address,
      contact,
      specialties: specialties || [],
      operatingHours: operatingHours || {
        monday: { start: '09:00', end: '18:00', isOpen: true },
        tuesday: { start: '09:00', end: '18:00', isOpen: true },
        wednesday: { start: '09:00', end: '18:00', isOpen: true },
        thursday: { start: '09:00', end: '18:00', isOpen: true },
        friday: { start: '09:00', end: '18:00', isOpen: true },
        saturday: { start: '09:00', end: '13:00', isOpen: false },
        sunday: { start: '09:00', end: '13:00', isOpen: false }
      },
      settings: settings || {
        maxCounselors: 10,
        allowOnlineBooking: true,
        requireApproval: false
      }
    };

    if (adminUser) {
      centerData.adminUser = adminUser._id;
    }

    const center = new CounselingCenter(centerData);
    await center.save();

    // 관리자를 센터에 연결
    if (adminUser && adminUser.role === 'counselor') {
      adminUser.counselingCenter = center._id;
      adminUser.isIndependent = false;
      await adminUser.save();
    }

    await center.populate('adminUser', 'name email');

    res.status(201).json({
      success: true,
      center: center,
      message: '상담센터가 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('상담센터 생성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 상담센터 수정
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const center = await CounselingCenter.findById(req.params.id);
    if (!center) {
      return res.status(404).json({ 
        success: false, 
        message: '상담센터를 찾을 수 없습니다.' 
      });
    }

    const {
      name,
      description,
      adminUserEmail,
      businessLicense,
      address,
      contact,
      specialties,
      operatingHours,
      settings,
      isActive
    } = req.body;

    // 관리자 변경 시
    if (adminUserEmail && adminUserEmail !== center.adminUser?.email) {
      const newAdmin = await User.findOne({ 
        email: adminUserEmail, 
        role: { $in: ['counselor', 'super-admin'] }
      });
      if (!newAdmin) {
        return res.status(400).json({ 
          success: false, 
          message: '유효한 관리자 사용자를 찾을 수 없습니다.' 
        });
      }

      // 기존 관리자 연결 해제
      if (center.adminUser) {
        const oldAdmin = await User.findById(center.adminUser);
        if (oldAdmin && oldAdmin.role === 'counselor') {
          oldAdmin.counselingCenter = undefined;
          oldAdmin.isIndependent = true;
          await oldAdmin.save();
        }
      }

      // 새 관리자 연결
      if (newAdmin.role === 'counselor') {
        newAdmin.counselingCenter = center._id;
        newAdmin.isIndependent = false;
        await newAdmin.save();
      }

      center.adminUser = newAdmin._id;
    }

    // 기타 필드 업데이트
    if (name) center.name = name;
    if (description !== undefined) center.description = description;
    if (businessLicense) center.businessLicense = businessLicense;
    if (address) center.address = address;
    if (contact) center.contact = contact;
    if (specialties) center.specialties = specialties;
    if (operatingHours) center.operatingHours = operatingHours;
    if (settings) center.settings = settings;
    if (isActive !== undefined) center.isActive = isActive;

    await center.save();
    await center.populate('adminUser', 'name email');

    res.json({
      success: true,
      center: center,
      message: '상담센터가 성공적으로 수정되었습니다.'
    });
  } catch (error) {
    console.error('상담센터 수정 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 상담센터 삭제
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const center = await CounselingCenter.findById(req.params.id);
    if (!center) {
      return res.status(404).json({ 
        success: false, 
        message: '상담센터를 찾을 수 없습니다.' 
      });
    }

    // 소속 상담사들을 개인자격으로 변경
    await User.updateMany(
      { counselingCenter: center._id },
      { 
        $unset: { counselingCenter: 1 },
        $set: { isIndependent: true }
      }
    );

    await center.remove();

    res.json({
      success: true,
      message: '상담센터가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('상담센터 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 상담센터에 상담사 추가
router.post('/:id/counselors', async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const { counselorEmail } = req.body;
    
    const center = await CounselingCenter.findById(req.params.id);
    if (!center) {
      return res.status(404).json({ 
        success: false, 
        message: '상담센터를 찾을 수 없습니다.' 
      });
    }

    const counselor = await User.findOne({ 
      email: counselorEmail, 
      role: 'counselor' 
    });
    if (!counselor) {
      return res.status(404).json({ 
        success: false, 
        message: '상담사를 찾을 수 없습니다.' 
      });
    }

    // 이미 다른 센터에 소속된 경우 확인
    if (counselor.counselingCenter && !counselor.isIndependent) {
      return res.status(400).json({ 
        success: false, 
        message: '이미 다른 상담센터에 소속된 상담사입니다.' 
      });
    }

    // 센터 최대 상담사 수 확인
    if (center.counselors.length >= center.settings.maxCounselors) {
      return res.status(400).json({ 
        success: false, 
        message: `상담센터 최대 상담사 수(${center.settings.maxCounselors}명)를 초과했습니다.` 
      });
    }

    // 상담사를 센터에 추가
    counselor.counselingCenter = center._id;
    counselor.isIndependent = false;
    await counselor.save();

    // 센터의 상담사 목록에 추가
    if (!center.counselors.includes(counselor._id)) {
      center.counselors.push(counselor._id);
      await center.save();
    }

    res.json({
      success: true,
      message: '상담사가 성공적으로 센터에 추가되었습니다.'
    });
  } catch (error) {
    console.error('상담사 추가 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 상담센터에서 상담사 제거
router.delete('/:id/counselors/:counselorId', async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const center = await CounselingCenter.findById(req.params.id);
    if (!center) {
      return res.status(404).json({ 
        success: false, 
        message: '상담센터를 찾을 수 없습니다.' 
      });
    }

    const counselor = await User.findById(req.params.counselorId);
    if (!counselor) {
      return res.status(404).json({ 
        success: false, 
        message: '상담사를 찾을 수 없습니다.' 
      });
    }

    // 상담사를 개인자격으로 변경
    counselor.counselingCenter = undefined;
    counselor.isIndependent = true;
    await counselor.save();

    // 센터의 상담사 목록에서 제거
    center.counselors = center.counselors.filter(
      id => !id.equals(counselor._id)
    );
    await center.save();

    res.json({
      success: true,
      message: '상담사가 성공적으로 센터에서 제거되었습니다.'
    });
  } catch (error) {
    console.error('상담사 제거 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

// 개인 자격 상담사 목록 조회
router.get('/independent/counselors', async (req, res) => {
  try {
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const independentCounselors = await User.find({
      role: 'counselor',
      isIndependent: true
    }).select('name email phone customRate taxRate totalSessions isActive createdAt');

    res.json({
      success: true,
      counselors: independentCounselors
    });
  } catch (error) {
    console.error('개인 자격 상담사 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  }
});

module.exports = router;