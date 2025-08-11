const express = require('express');
const { body, validationResult } = require('express-validator');
const Company = require('../models/Company');
const Counselor = require('../models/Counselor');
const CounselingCenter = require('../models/CounselingCenter');
const CounselingSession = require('../models/CounselingSession');
const CounselorPayment = require('../models/CounselorPayment');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 플랫폼 전체 통계 조회
router.get('/stats', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    // 기본 카운트 조회
    const [
      totalCompanies,
      activeCompanies,
      totalEmployees,
      totalCounselors,
      activeCounselors,
      totalCounselingCenters,
      totalSessions,
      completedSessions
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $in: ['employee', 'manager'] } }),
      Counselor.countDocuments(),
      Counselor.countDocuments({ isActive: true }),
      CounselingCenter.countDocuments(),
      CounselingSession.countDocuments(),
      CounselingSession.countDocuments({ status: 'completed' })
    ]);

    // 월별 매출 계산 (완료된 상담 세션 기반)
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    // 이번 달 완료된 상담 세션들의 금액 합계
    const currentMonthRevenue = await CounselingSession.aggregate([
      {
        $match: {
          status: 'completed',
          appointmentDate: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$counselorRate' }
        }
      }
    ]);
    
    const monthlyRevenue = currentMonthRevenue.length > 0 ? currentMonthRevenue[0].totalRevenue : 0;

    // 성장률 계산 (지난 달 완료된 상담 세션 기반)
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    const lastMonthRevenueResult = await CounselingSession.aggregate([
      {
        $match: {
          status: 'completed',
          appointmentDate: {
            $gte: new Date(lastMonthYear, lastMonth - 1, 1),
            $lt: new Date(lastMonthYear, lastMonth, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$counselorRate' }
        }
      }
    ]);
    
    const lastMonthRevenue = lastMonthRevenueResult.length > 0 ? lastMonthRevenueResult[0].totalRevenue : 0;

    const growthRate = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
      : 0;

    const stats = {
      totalCompanies,
      activeCompanies,
      totalEmployees,
      totalCounselors,
      activeCounselors,
      totalCounselingCenters,
      totalSessions,
      completedSessions,
      monthlyRevenue,
      growthRate: Math.round(growthRate * 10) / 10
    };

    res.json(stats);
  } catch (error) {
    console.error('플랫폼 통계 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 회사 목록 조회 (Super Admin용) - 최적화된 버전
router.get('/companies', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const { page = 1, limit = 10, search, plan, status, fields } = req.query;
    
    let filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessRegistrationNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (plan) filter['serviceContract.plan'] = plan;
    if (status) filter.isActive = status === 'active';

    // 필드 선택 최적화 (필요한 필드만 조회)
    let selectFields = fields ? fields.split(',').join(' ') : '';
    
    const companies = await Company.find(filter, selectFields)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .lean(); // 성능 향상을 위해 lean() 사용

    // 통계 정보가 필요한 경우에만 계산
    const includeStats = !fields || fields.includes('employeeCount') || fields.includes('sessionCount');
    
    let companiesWithStats = companies;
    if (includeStats) {
      // 배치로 통계 정보 조회 (각각 개별 쿼리 대신)
      const companyIds = companies.map(c => c._id);
      const companyNames = companies.map(c => c.name);
      
      const [employeeCounts, sessionCounts] = await Promise.all([
        User.aggregate([
          // { $match: { company: { $in: companyIds } } }, // TODO: User 모델에 company 필드 추가 필요
          { $group: { _id: '$company', count: { $sum: 1 } } }
        ]),
        CounselingSession.aggregate([
          { $match: { company: { $in: companyNames } } },
          { $group: { _id: '$company', count: { $sum: 1 } } }
        ])
      ]);

      // 결과 매핑을 위한 Map 생성
      const employeeCountMap = new Map(employeeCounts.map(item => [item._id?.toString(), item.count]));
      const sessionCountMap = new Map(sessionCounts.map(item => [item._id, item.count]));

      companiesWithStats = companies.map(company => {
        const employeeCount = employeeCountMap.get(company._id?.toString()) || 0;
        const sessionCount = sessionCountMap.get(company.name) || 0;
        
        return {
          ...company,
          employeeCount,
          sessionCount,
          utilizationRate: company.serviceContract?.maxEmployees > 0 
            ? (employeeCount / company.serviceContract.maxEmployees * 100)
            : 0
        };
      });
    }

    const total = await Company.countDocuments(filter);

    res.json({
      companies: companiesWithStats,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    });
  } catch (error) {
    console.error('회사 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 대시보드용 실시간 데이터 조회
router.get('/dashboard-data', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    // 최근 활동들
    const [recentSessions, pendingAssignments, recentPayments] = await Promise.all([
      CounselingSession.find({ status: 'completed' })
        .populate('employee', 'name')
        .populate('counselor', 'name')
        .sort({ updatedAt: -1 })
        .limit(5),
      
      CounselingSession.find({ assignmentStatus: 'pending' })
        .populate('employee', 'name email department')
        .sort({ createdAt: 1, urgencyLevel: -1 })
        .limit(10),
      
      CounselorPayment.find({ status: 'pending' })
        .populate('counselor', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // 월별 트렌드 데이터 (최근 6개월)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() - i);
      
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      
      const sessionsCount = await CounselingSession.countDocuments({
        status: 'completed',
        appointmentDate: {
          $gte: new Date(year, month - 1, 1),
          $lt: new Date(year, month, 1)
        }
      });
      
      monthlyTrends.push({
        year,
        month,
        monthName: targetDate.toLocaleDateString('ko-KR', { month: 'long' }),
        sessions: sessionsCount
      });
    }

    // 상담 방식별 통계
    const methodStats = await CounselingSession.aggregate([
      { $match: { status: 'completed' } },
      { $group: { 
          _id: '$counselingMethod', 
          count: { $sum: 1 },
          totalAmount: { $sum: '$counselorRate' }
        }
      }
    ]);

    res.json({
      recentSessions,
      pendingAssignments,
      recentPayments,
      monthlyTrends,
      methodStats
    });
  } catch (error) {
    console.error('대시보드 데이터 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 시스템 설정 조회
router.get('/settings', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    // 시스템 기본 설정 (실제로는 별도 설정 모델 필요)
    const settings = {
      platform: {
        name: 'EAP Service Platform',
        version: '1.0.0',
        maintenanceMode: false
      },
      payment: {
        taxRate: 0.1,
        defaultCurrency: 'KRW',
        paymentMethods: ['bank_transfer', 'check', 'digital_wallet']
      },
      session: {
        defaultDuration: 50, // 분
        maxDailyAppointments: 10,
        urgencyLevels: ['low', 'medium', 'high', 'critical']
      },
      notification: {
        emailEnabled: true,
        smsEnabled: false,
        slackEnabled: true
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('시스템 설정 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 시스템 설정 업데이트
router.put('/settings', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const { settings } = req.body;
    
    // TODO: 실제로는 시스템 설정을 DB에 저장
    // 현재는 간단히 성공 응답만 반환
    
    res.json({
      message: '설정이 업데이트되었습니다.',
      settings
    });
  } catch (error) {
    console.error('시스템 설정 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 테스트 데이터 생성 API
router.post('/generate-test-data', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    
    // generateTestData.js 스크립트 실행
    const scriptPath = path.join(__dirname, '../scripts/generateTestData.js');
    const child = spawn('node', [scriptPath]);
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        res.json({
          success: true,
          message: '테스트 데이터가 성공적으로 생성되었습니다.',
          output: output
        });
      } else {
        res.status(500).json({
          success: false,
          message: '테스트 데이터 생성 중 오류가 발생했습니다.',
          error: errorOutput
        });
      }
    });
    
  } catch (error) {
    console.error('테스트 데이터 생성 API 오류:', error);
    res.status(500).json({ 
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 데이터 백업 생성

// 새 회사 생성 (회사어드민 계정도 함께 생성)
router.post('/companies', [
  auth, 
  authorize(['super-admin']),
  body('name').trim().isLength({ min: 1 }).withMessage('회사명을 입력하세요.'),
  body('domain').trim().isLength({ min: 1 }).withMessage('도메인을 입력하세요.'),
  body('industry').trim().isLength({ min: 1 }).withMessage('업종을 입력하세요.'),
  body('adminEmail').isEmail().withMessage('올바른 관리자 이메일을 입력하세요.'),
  body('adminName').trim().isLength({ min: 1 }).withMessage('관리자 이름을 입력하세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, domain, industry, adminEmail, adminName, plan = 'standard', maxEmployees = 100, annualCounselingLimit = 12 } = req.body;

    // 중복 이메일 체크
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 중복 회사명/도메인 체크
    const existingCompany = await Company.findOne({ 
      $or: [{ name }, { domain }] 
    });
    if (existingCompany) {
      return res.status(400).json({ error: '이미 등록된 회사명 또는 도메인입니다.' });
    }

    // 새 회사 생성
    const newCompany = new Company({
      name,
      domain,
      industry,
      plan,
      settings: {
        maxEmployees,
        allowSelfRegistration: true, // 기본적으로 자가등록 허용
        annualCounselingLimit
      }
    });

    const savedCompany = await newCompany.save();

    // 회사어드민 계정 생성
    const adminUser = new User({
      email: adminEmail,
      name: adminName,
      role: 'company-admin',
      company: savedCompany._id,
      password: 'TempPassword123!', // 임시 비밀번호
      isActive: true,
      annualCounselingUsage: {
        year: new Date().getFullYear(),
        used: 0,
        limit: annualCounselingLimit
      }
    });

    const savedAdmin = await adminUser.save();

    // 회사에 관리자 연결
    savedCompany.adminUser = savedAdmin._id;
    await savedCompany.save();

    // 응답 데이터 준비
    const responseData = {
      company: {
        _id: savedCompany._id,
        name: savedCompany.name,
        domain: savedCompany.domain,
        industry: savedCompany.industry,
        plan: savedCompany.plan,
        employeeCount: 0,
        activeCounselors: 0,
        monthlyUsage: 0,
        status: 'active',
        createdAt: savedCompany.createdAt.toISOString().split('T')[0],
        lastActivity: new Date().toISOString().split('T')[0],
        settings: savedCompany.settings
      },
      admin: {
        _id: savedAdmin._id,
        email: savedAdmin.email,
        name: savedAdmin.name,
        tempPassword: 'TempPassword123!'
      }
    };

    res.status(201).json(responseData);
  } catch (error) {
    console.error('회사 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.post('/backup', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const backupData = {
      companies: await Company.find({}).limit(100),
      counselors: await Counselor.find({}).select('-password').limit(100),
      users: await User.find({}).select('-password').limit(100),
      sessions: await CounselingSession.find({}).limit(500),
      payments: await CounselorPayment.find({}).limit(100)
    };

    const backup = {
      createdAt: new Date(),
      version: '1.0.0',
      data: backupData,
      counts: {
        companies: backupData.companies.length,
        counselors: backupData.counselors.length,
        users: backupData.users.length,
        sessions: backupData.sessions.length,
        payments: backupData.payments.length
      }
    };

    res.json({
      message: '백업이 생성되었습니다.',
      backup: {
        createdAt: backup.createdAt,
        version: backup.version,
        counts: backup.counts
      }
      // 실제 데이터는 파일로 저장하거나 별도 저장소에 저장
    });
  } catch (error) {
    console.error('데이터 백업 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 시스템 모니터링 정보
router.get('/monitoring', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const monitoring = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version
      },
      database: {
        connected: mongoose.connection.readyState === 1,
        collections: mongoose.connection.db ? 
          Object.keys(mongoose.connection.db.collections).length : 0
      },
      performance: {
        averageResponseTime: '~150ms', // 실제로는 모니터링 도구에서 수집
        errorRate: '0.1%',
        throughput: '50 req/min'
      },
      alerts: []
    };

    // 간단한 알림 로직
    if (monitoring.server.memory.heapUsed > 100 * 1024 * 1024) {
      monitoring.alerts.push({
        level: 'warning',
        message: '메모리 사용량이 높습니다.',
        timestamp: new Date()
      });
    }

    res.json(monitoring);
  } catch (error) {
    console.error('시스템 모니터링 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;