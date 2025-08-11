const express = require('express');
const { body, validationResult } = require('express-validator');
const Company = require('../models/Company');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 회사어드민이 자신의 회사 정보 조회
router.get('/my-company', [auth, authorize(['company-admin'])], async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user || !user.company) {
      return res.status(404).json({ error: '연결된 회사 정보가 없습니다.' });
    }

    // 회사 정보 직접 조회
    const company = await Company.findById(user.company);
    
    if (!company) {
      return res.status(404).json({ error: '회사 정보를 찾을 수 없습니다.' });
    }

    // 회사 직원 수 계산
    const employeeCount = await User.countDocuments({ 
      company: company._id,
      role: { $in: ['employee', 'manager'] }
    });

    const companyData = {
      ...company.toObject(),
      employeeCount
    };

    res.json({ company: companyData });
  } catch (error) {
    console.error('회사 정보 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 직원 가입용 회사 목록 조회 (공개)
router.get('/public', async (req, res) => {
  try {
    const companies = await Company.find({ 
      isActive: true,
      'settings.allowSelfRegistration': true 
    })
      .select('name domain industry')
      .sort({ name: 1 });

    res.json({ companies });
  } catch (error) {
    console.error('공개 회사 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 회사 목록 조회 (Super Admin용)
router.get('/', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const filter = {};
    
    if (typeof isActive !== 'undefined') {
      filter.isActive = isActive === 'true';
    }

    const companies = await Company.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Company.countDocuments(filter);

    res.json({
      companies,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('회사 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회사 상세 정보 조회
router.get('/:id', [auth, authorize(['super-admin', 'company-admin'])], async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: '회사를 찾을 수 없습니다.' });
    }

    // Company Admin은 본인 회사만 조회 가능 (실제로는 User 모델에 회사 정보 필요)
    if (req.user.role === 'company-admin') {
      // TODO: 사용자의 회사 정보 확인
    }

    res.json(company);
  } catch (error) {
    console.error('회사 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회사 등록 (Super Admin용)
router.post('/', [auth, authorize(['super-admin'])], [
  body('name').trim().isLength({ min: 2 }).withMessage('회사명은 2자 이상이어야 합니다.'),
  body('businessRegistrationNumber').trim().isLength({ min: 1 }).withMessage('사업자등록번호를 입력하세요.'),
  body('address').trim().isLength({ min: 1 }).withMessage('주소를 입력하세요.'),
  body('phone').trim().isLength({ min: 1 }).withMessage('전화번호를 입력하세요.'),
  body('email').isEmail().normalizeEmail().withMessage('유효한 이메일을 입력하세요.'),
  body('serviceContract.plan').isIn(['basic', 'premium', 'enterprise']).withMessage('유효한 플랜을 선택하세요.'),
  body('serviceContract.maxEmployees').isInt({ min: 1 }).withMessage('최대 직원 수를 입력하세요.'),
  body('serviceContract.annualServiceFee').isInt({ min: 0 }).withMessage('연간 서비스료를 입력하세요.'),
  body('serviceContract.sessionRate').isInt({ min: 0 }).withMessage('세션당 요금을 입력하세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      businessRegistrationNumber,
      address,
      phone,
      email,
      contactPerson,
      serviceContract
    } = req.body;

    // 사업자등록번호 중복 체크
    const existingCompany = await Company.findOne({ businessRegistrationNumber });
    if (existingCompany) {
      return res.status(400).json({ message: '이미 등록된 사업자등록번호입니다.' });
    }

    const company = new Company({
      name,
      businessRegistrationNumber,
      address,
      phone,
      email,
      contactPerson,
      serviceContract: {
        ...serviceContract,
        startDate: new Date(serviceContract.startDate),
        endDate: new Date(serviceContract.endDate)
      },
      balance: serviceContract.annualServiceFee, // 초기 잔액은 연간 서비스료
      isActive: true
    });

    await company.save();

    res.status(201).json({
      message: '회사가 성공적으로 등록되었습니다.',
      company
    });
  } catch (error) {
    console.error('회사 등록 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회사 정보 수정
router.put('/:id', [auth, authorize(['super-admin', 'company-admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    
    const updateFields = {};
    const allowedFields = ['name', 'address', 'phone', 'email', 'contactPerson'];
    const superAdminFields = ['serviceContract', 'balance', 'isActive', 'settings'];

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
          updateFields[field] = req.body[field];
        }
      });
    }

    const company = await Company.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({ message: '회사를 찾을 수 없습니다.' });
    }

    res.json({
      message: '회사 정보가 업데이트되었습니다.',
      company
    });
  } catch (error) {
    console.error('회사 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회사 잔액 충전 (Super Admin용)
router.post('/:id/charge', [auth, authorize(['super-admin'])], [
  body('amount').isInt({ min: 1 }).withMessage('충전 금액은 1 이상이어야 합니다.'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { amount, description } = req.body;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: '회사를 찾을 수 없습니다.' });
    }

    company.balance += amount;
    await company.save();

    res.json({
      message: '잔액이 충전되었습니다.',
      company: {
        id: company._id,
        name: company.name,
        balance: company.balance,
        chargedAmount: amount
      }
    });
  } catch (error) {
    console.error('잔액 충전 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회사 사용량 통계 조회
router.get('/:id/usage', [auth, authorize(['super-admin', 'company-admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month } = req.query;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: '회사를 찾을 수 없습니다.' });
    }

    let usageData = {
      currentBalance: company.balance,
      totalSessionsUsed: company.totalSessionsUsed,
      monthlyUsage: company.monthlyUsage
    };

    // 특정 년/월 필터링
    if (year && month) {
      const filteredUsage = company.monthlyUsage.filter(
        usage => usage.year === parseInt(year) && usage.month === parseInt(month)
      );
      usageData.monthlyUsage = filteredUsage;
    }

    res.json(usageData);
  } catch (error) {
    console.error('사용량 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회사 직원 목록 조회 (회사 관리자용)
router.get('/:id/employees', [auth, authorize(['company-admin', 'super-admin'])], async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, department, role } = req.query;

    // TODO: 실제로는 User 모델에 company 필드가 필요
    // 현재는 간단한 구조로 구현
    let filter = {};
    if (department) filter.department = department;
    if (role) filter.role = role;

    const employees = await User.find(filter)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.json({
      employees,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('직원 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 플랫폼 전체 통계 (Super Admin용)
router.get('/stats/platform', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ isActive: true });
    const totalEmployees = await User.countDocuments({ role: { $in: ['employee', 'manager'] } });
    const totalCounselors = await User.countDocuments({ role: 'counselor' });

    // 월별 매출 계산 (간단한 버전)
    const companies = await Company.find({});
    const monthlyRevenue = companies.reduce((sum, company) => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const monthlyUsage = company.monthlyUsage.find(
        usage => usage.year === currentYear && usage.month === currentMonth
      );
      
      return sum + (monthlyUsage ? monthlyUsage.totalCost : 0);
    }, 0);

    const stats = {
      totalCompanies,
      activeCompanies,
      totalEmployees,
      totalCounselors,
      monthlyRevenue,
      totalSessions: 0, // CounselingSession에서 계산해야 함
      growthRate: 0 // 이전 달 대비 성장률 계산 필요
    };

    res.json(stats);
  } catch (error) {
    console.error('플랫폼 통계 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 공개 API: 회사별 부서 목록 조회 (회원가입용)
router.get('/:id/departments', async (req, res) => {
  try {
    const { id } = req.params;
    
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: '회사를 찾을 수 없습니다.' });
    }

    res.json({
      departments: company.settings?.departments || []
    });
  } catch (error) {
    console.error('회사 부서 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;