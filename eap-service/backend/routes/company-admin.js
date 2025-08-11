const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Company = require('../models/Company');
const CounselingSession = require('../models/CounselingSession');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 회사 비즈니스 메트릭 조회
router.get('/business-metrics', [auth, authorize(['company-admin'])], async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.company) {
      return res.status(404).json({ error: '연결된 회사 정보가 없습니다.' });
    }

    const company = await Company.findById(user.company);
    if (!company) {
      return res.status(404).json({ error: '회사 정보를 찾을 수 없습니다.' });
    }

    res.json({
      businessMetrics: company.businessMetrics || {
        annualRevenue: 0,
        avgEmployeeSalary: 50000000,
        preEapAbsenteeismDays: 0,
        preEapTurnoverRate: 15,
        dailyProductivityPerEmployee: 200000,
        recruitmentTrainingCost: 10000000
      }
    });
  } catch (error) {
    console.error('비즈니스 메트릭 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 회사 비즈니스 메트릭 업데이트
router.put('/business-metrics', [auth, authorize(['company-admin'])], [
  body('businessMetrics.annualRevenue').isInt({ min: 0 }).withMessage('연간 매출은 0 이상이어야 합니다.'),
  body('businessMetrics.avgEmployeeSalary').isInt({ min: 0 }).withMessage('평균 연봉은 0 이상이어야 합니다.'),
  body('businessMetrics.preEapAbsenteeismDays').isInt({ min: 0 }).withMessage('결근일수는 0 이상이어야 합니다.'),
  body('businessMetrics.preEapTurnoverRate').isFloat({ min: 0, max: 100 }).withMessage('이직률은 0-100% 사이여야 합니다.'),
  body('businessMetrics.dailyProductivityPerEmployee').isInt({ min: 0 }).withMessage('일일 생산성은 0 이상이어야 합니다.'),
  body('businessMetrics.recruitmentTrainingCost').isInt({ min: 0 }).withMessage('채용 비용은 0 이상이어야 합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.company) {
      return res.status(404).json({ error: '연결된 회사 정보가 없습니다.' });
    }

    const { businessMetrics } = req.body;

    const company = await Company.findByIdAndUpdate(
      user.company,
      { businessMetrics },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ error: '회사 정보를 찾을 수 없습니다.' });
    }

    res.json({
      message: '비즈니스 메트릭이 업데이트되었습니다.',
      businessMetrics: company.businessMetrics
    });
  } catch (error) {
    console.error('비즈니스 메트릭 업데이트 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 회사 부서 목록 조회
router.get('/departments', [auth, authorize(['company-admin'])], async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.company) {
      return res.status(404).json({ error: '연결된 회사 정보가 없습니다.' });
    }

    const company = await Company.findById(user.company);
    if (!company) {
      return res.status(404).json({ error: '회사 정보를 찾을 수 없습니다.' });
    }

    res.json({
      departments: company.settings?.departments || []
    });
  } catch (error) {
    console.error('부서 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 회사 부서 목록 업데이트
router.put('/departments', [auth, authorize(['company-admin'])], [
  body('departments').isArray().withMessage('부서 목록은 배열이어야 합니다.'),
  body('departments.*').trim().isLength({ min: 1 }).withMessage('부서명은 1자 이상이어야 합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.company) {
      return res.status(404).json({ error: '연결된 회사 정보가 없습니다.' });
    }

    const { departments } = req.body;

    const company = await Company.findByIdAndUpdate(
      user.company,
      { 'settings.departments': departments },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ error: '회사 정보를 찾을 수 없습니다.' });
    }

    res.json({
      message: '부서 목록이 업데이트되었습니다.',
      departments: company.settings.departments
    });
  } catch (error) {
    console.error('부서 목록 업데이트 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 회사 통계 조회
router.get('/stats', [auth, authorize(['company-admin'])], async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.company) {
      return res.status(404).json({ error: '연결된 회사 정보가 없습니다.' });
    }

    // 회사 직원 수 계산
    const totalEmployees = await User.countDocuments({ 
      company: user.company,
      role: { $in: ['employee', 'manager'] }
    });

    // 이번 달 상담 세션 수
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const monthlyUsage = await CounselingSession.countDocuments({
      company: user.company,
      status: { $in: ['completed', 'scheduled'] },
      appointmentDate: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lt: new Date(currentYear, currentMonth, 1)
      }
    });

    // 완료된 상담 수
    const completedSessions = await CounselingSession.countDocuments({
      company: user.company,
      status: 'completed'
    });

    // 부서별 사용량 (데모 데이터)
    const departmentUsage = {
      'IT개발팀': 15,
      '마케팅팀': 12,
      '영업팀': 8,
      '인사팀': 5,
      '재무팀': 3
    };

    const utilizationRate = totalEmployees > 0 ? Math.round((monthlyUsage / totalEmployees) * 100) : 0;

    res.json({
      totalEmployees,
      totalSessions: completedSessions + monthlyUsage,
      completedSessions,
      monthlyUsage,
      departmentUsage,
      utilizationRate
    });
  } catch (error) {
    console.error('회사 통계 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 직원 목록 조회
router.get('/employees', [auth, authorize(['company-admin'])], async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.company) {
      return res.status(404).json({ error: '연결된 회사 정보가 없습니다.' });
    }

    const employees = await User.find({ 
      company: user.company,
      role: { $in: ['employee', 'manager'] }
    }).select('-password');

    // 직원 데이터를 프론트엔드 형식으로 변환
    const formattedEmployees = employees.map(emp => ({
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      department: emp.department || '미지정',
      position: '직원', // 실제로는 별도 필드 필요
      role: emp.role,
      annualLimit: emp.annualCounselingUsage?.limit || 12,
      usedSessions: emp.annualCounselingUsage?.used || 0,
      joinDate: emp.createdAt.toISOString().split('T')[0],
      isActive: emp.isActive
    }));

    res.json(formattedEmployees);
  } catch (error) {
    console.error('직원 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 직원 등록
router.post('/employees', [auth, authorize(['company-admin'])], [
  body('name').trim().isLength({ min: 2 }).withMessage('이름은 2자 이상이어야 합니다.'),
  body('email').isEmail().normalizeEmail().withMessage('올바른 이메일을 입력하세요.'),
  body('department').trim().isLength({ min: 1 }).withMessage('부서를 입력하세요.'),
  body('role').isIn(['employee', 'manager']).withMessage('올바른 권한을 선택하세요.'),
  body('annualLimit').isInt({ min: 1 }).withMessage('연간 할당량을 입력하세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const adminUser = await User.findById(req.user._id);
    if (!adminUser || !adminUser.company) {
      return res.status(404).json({ error: '연결된 회사 정보가 없습니다.' });
    }

    const { name, email, department, role, annualLimit } = req.body;

    // 이메일 중복 확인 및 처리
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // 기존 사용자가 이미 같은 회사에 속해있는지 확인
      if (existingUser.company && existingUser.company.toString() === adminUser.company.toString()) {
        return res.status(400).json({ error: '이미 등록된 직원입니다.' });
      }
      
      // 기존 사용자가 다른 회사에 속해있는 경우
      if (existingUser.company && existingUser.company.toString() !== adminUser.company.toString()) {
        return res.status(400).json({ error: '다른 회사에 이미 등록된 이메일입니다.' });
      }
      
      // 기존 사용자가 회사에 속하지 않은 경우 (개별 가입자) - 회사에 연결
      existingUser.company = adminUser.company;
      existingUser.department = department;
      existingUser.role = role;
      existingUser.annualCounselingUsage = {
        year: new Date().getFullYear(),
        used: existingUser.annualCounselingUsage?.used || 0,
        limit: annualLimit
      };
      
      await existingUser.save();
      
      return res.status(200).json({
        message: '기존 사용자를 회사에 연결했습니다.',
        employee: {
          _id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          department: existingUser.department,
          position: '직원',
          role: existingUser.role,
          annualLimit: annualLimit,
          usedSessions: existingUser.annualCounselingUsage?.used || 0,
          joinDate: existingUser.createdAt.toISOString().split('T')[0],
          isActive: existingUser.isActive
        }
      });
    }

    // 새 직원 생성
    const newEmployee = new User({
      name,
      email,
      password: 'TempPassword123!', // 임시 비밀번호
      department,
      role,
      company: adminUser.company,
      annualCounselingUsage: {
        year: new Date().getFullYear(),
        used: 0,
        limit: annualLimit
      },
      isActive: true
    });

    await newEmployee.save();

    res.status(201).json({
      message: '직원이 성공적으로 등록되었습니다.',
      employee: {
        _id: newEmployee._id,
        name: newEmployee.name,
        email: newEmployee.email,
        department: newEmployee.department,
        position: '직원',
        role: newEmployee.role,
        annualLimit: annualLimit,
        usedSessions: 0,
        joinDate: newEmployee.createdAt.toISOString().split('T')[0],
        isActive: true
      }
    });
  } catch (error) {
    console.error('직원 등록 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 월간 사용현황 보고서 생성
router.post('/reports/monthly', [auth, authorize(['company-admin'])], [
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('유효한 연도를 입력하세요.'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('유효한 월을 입력하세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.company) {
      return res.status(404).json({ error: '연결된 회사 정보가 없습니다.' });
    }

    const { year, month } = req.body;

    // 해당 월의 상담 세션 조회
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const sessions = await CounselingSession.find({
      company: user.company,
      appointmentDate: { $gte: startDate, $lte: endDate }
    })
    .populate('employee', 'name department')
    .populate('counselor', 'name');

    // 부서별 집계
    const departmentStats = {};
    sessions.forEach(session => {
      const dept = session.employee?.department || '미지정';
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          totalSessions: 0,
          completedSessions: 0,
          employees: new Set()
        };
      }
      departmentStats[dept].totalSessions++;
      if (session.status === 'completed') {
        departmentStats[dept].completedSessions++;
      }
      departmentStats[dept].employees.add(session.employee?._id);
    });

    // Set을 배열 크기로 변환
    Object.keys(departmentStats).forEach(dept => {
      departmentStats[dept].employeeCount = departmentStats[dept].employees.size;
      delete departmentStats[dept].employees;
    });

    const report = {
      period: `${year}년 ${month}월`,
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      departmentStats,
      generatedAt: new Date(),
      reportType: 'monthly'
    };

    res.json({
      message: '월간 보고서가 생성되었습니다.',
      report
    });
  } catch (error) {
    console.error('월간 보고서 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 만족도 조사 보고서 생성
router.post('/reports/satisfaction', [auth, authorize(['company-admin'])], [
  body('period').isIn(['분기별', '월별', '연간']).withMessage('유효한 기간을 선택하세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.company) {
      return res.status(404).json({ error: '연결된 회사 정보가 없습니다.' });
    }

    const { period } = req.body;

    // 만족도 데이터 (실제로는 설문 조사 결과에서 가져와야 함)
    const satisfactionReport = {
      period,
      averageRating: 4.2,
      responseRate: 75,
      totalResponses: 89,
      categoryRatings: {
        '상담사 전문성': 4.5,
        '상담 환경': 4.1,
        '예약 편의성': 3.9,
        '비밀보장': 4.6,
        '전반적 만족도': 4.2
      },
      improvements: [
        '예약 시스템 개선 요청',
        '상담실 환경 개선',
        '다양한 상담 방식 제공'
      ],
      generatedAt: new Date(),
      reportType: 'satisfaction'
    };

    res.json({
      message: '만족도 조사 보고서가 생성되었습니다.',
      report: satisfactionReport
    });
  } catch (error) {
    console.error('만족도 보고서 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 비용 분석 보고서 생성
router.post('/reports/cost', [auth, authorize(['company-admin'])], [
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('유효한 연도를 입력하세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.company) {
      return res.status(404).json({ error: '연결된 회사 정보가 없습니다.' });
    }

    const { year } = req.body;

    // 회사 정보 조회
    const company = await Company.findById(user.company);
    
    // 해당 연도의 상담 세션 조회
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const sessions = await CounselingSession.find({
      company: user.company,
      appointmentDate: { $gte: startDate, $lte: endDate },
      status: 'completed'
    });

    // 현재 직원 수 조회
    const currentEmployeeCount = await User.countDocuments({ 
      company: user.company,
      role: { $in: ['employee', 'manager'] },
      isActive: true
    });

    // 비용 계산
    const totalSessions = sessions.length;
    const avgSessionCost = 80000; // 세션당 평균 비용
    const totalCost = totalSessions * avgSessionCost;
    
    // 월별 비용 분석
    const monthlyCosts = {};
    for (let i = 0; i < 12; i++) {
      const monthSessions = sessions.filter(session => {
        const sessionMonth = new Date(session.appointmentDate).getMonth();
        return sessionMonth === i;
      });
      monthlyCosts[i + 1] = {
        month: i + 1,
        sessions: monthSessions.length,
        cost: monthSessions.length * avgSessionCost
      };
    }

    // 회사 비즈니스 메트릭 (기본값 사용 또는 실제 데이터)
    const metrics = company.businessMetrics || {};
    const avgEmployeeSalary = metrics.avgEmployeeSalary || 50000000;
    const dailyProductivity = metrics.dailyProductivityPerEmployee || 200000;
    const recruitmentCost = metrics.recruitmentTrainingCost || 10000000;
    const preEapTurnoverRate = metrics.preEapTurnoverRate || 15;
    const preEapAbsenteeism = metrics.preEapAbsenteeismDays || (currentEmployeeCount * 8); // 직원당 연간 8일 가정

    // 더 정확한 ROI 계산
    // 1. EAP 효과로 인한 결근 감소 (상담 1회당 0.5일 결근 감소 가정)
    const absenteeismReduction = totalSessions * 0.5;
    const absenteeismSavings = absenteeismReduction * dailyProductivity;

    // 2. 이직률 감소 효과 (EAP로 이직률 20% 감소 가정)
    const turnoverReduction = (preEapTurnoverRate * 0.2 / 100) * currentEmployeeCount;
    const turnoverSavings = turnoverReduction * recruitmentCost;

    // 3. 생산성 향상 (스트레스 감소로 인한 업무 효율성 3% 향상 가정)
    const productivityImprovement = 0.03;
    const productivityGainPerEmployee = (avgEmployeeSalary * productivityImprovement) / currentEmployeeCount;
    const totalProductivityGain = totalSessions * productivityGainPerEmployee * 12; // 연간화

    // 4. 의료비 절감 (정신건강 개선으로 의료비 15% 절약)
    const avgMedicalCostPerEmployee = avgEmployeeSalary * 0.05; // 연봉의 5%를 의료비로 가정
    const medicalSavings = (totalSessions / currentEmployeeCount) * avgMedicalCostPerEmployee * 0.15;

    const totalBenefits = absenteeismSavings + turnoverSavings + totalProductivityGain + medicalSavings;
    const roiPercentage = totalCost > 0 ? Math.round((totalBenefits / totalCost) * 100) : 0;

    const costReport = {
      year,
      totalSessions,
      totalCost,
      avgSessionCost,
      monthlyCosts,
      costPerEmployee: currentEmployeeCount > 0 ? Math.round(totalCost / currentEmployeeCount) : 0,
      currentEmployeeCount,
      roi: {
        // 세부 효과
        absenteeismReduction: Math.round(absenteeismReduction * 10) / 10,
        absenteeismSavings: Math.round(absenteeismSavings),
        turnoverReduction: Math.round(turnoverReduction * 10) / 10,
        turnoverSavings: Math.round(turnoverSavings),
        productivityGain: Math.round(totalProductivityGain),
        medicalSavings: Math.round(medicalSavings),
        // 총합
        totalBenefits: Math.round(totalBenefits),
        roiPercentage,
        // 부가 정보
        assumptions: {
          absenteeismReductionPerSession: 0.5,
          turnoverReductionRate: 20,
          productivityImprovementRate: 3,
          medicalCostSavingRate: 15
        }
      },
      businessContext: {
        employeeCount: currentEmployeeCount,
        avgSalary: avgEmployeeSalary,
        dailyProductivity,
        preEapMetrics: {
          turnoverRate: preEapTurnoverRate,
          absenteeismDays: preEapAbsenteeism
        }
      },
      generatedAt: new Date(),
      reportType: 'cost'
    };

    res.json({
      message: '비용 분석 보고서가 생성되었습니다.',
      report: costReport
    });
  } catch (error) {
    console.error('비용 보고서 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;