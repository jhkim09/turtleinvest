const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Company = require('../models/Company');

const router = express.Router();

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  body('role').isIn(['employee', 'manager', 'counselor', 'company-admin', 'super-admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role, department, employeeId, companyId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: '이미 등록된 이메일입니다.' });
    }

    // 직원 등록 시 회사 선택 필수
    if (role === 'employee' && !companyId) {
      return res.status(400).json({ message: '직원은 소속 회사를 선택해야 합니다.' });
    }

    let selectedCompany = null;
    let annualCounselingLimit = 12; // 기본값

    // 회사 정보 가져오기
    if (companyId) {
      selectedCompany = await Company.findById(companyId);
      if (!selectedCompany) {
        return res.status(400).json({ message: '선택한 회사를 찾을 수 없습니다.' });
      }
      
      if (!selectedCompany.settings.allowSelfRegistration) {
        return res.status(400).json({ message: '해당 회사는 직원 자가 등록을 허용하지 않습니다.' });
      }

      annualCounselingLimit = selectedCompany.settings.annualCounselingLimit;
    }

    const userData = {
      email,
      password,
      name,
      role,
      department,
      employeeId
    };

    // 직원인 경우 회사 연결 및 상담 한도 설정
    if (role === 'employee' && selectedCompany) {
      userData.company = selectedCompany._id;
      userData.annualCounselingUsage = {
        year: new Date().getFullYear(),
        used: 0,
        limit: annualCounselingLimit
      };
    }

    const user = new User(userData);

    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: '잘못된 이메일 또는 비밀번호입니다.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: '잘못된 이메일 또는 비밀번호입니다.' });
    }

    if (!user.isActive) {
      return res.status(400).json({ message: '비활성화된 계정입니다.' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;