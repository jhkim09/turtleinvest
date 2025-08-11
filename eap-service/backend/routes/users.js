const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/counselors', auth, async (req, res) => {
  try {
    const counselors = await User.find({ role: 'counselor', isActive: true })
      .select('name email')
      .sort({ name: 1 });
    
    res.json(counselors);
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.put('/profile', auth, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('department').optional().trim(),
  body('taxRate').optional().isIn([3.3, 10]),
  body('customRate').optional().isInt({ min: 10000, max: 200000 }),
  body('useSystemRate').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, department, taxRate, customRate, useSystemRate } = req.body;
    const updateFields = {};
    
    if (name) updateFields.name = name;
    if (department && req.user.role === 'employee') updateFields.department = department;
    
    // 상담사 전용 필드 업데이트
    if (req.user.role === 'counselor') {
      if (taxRate !== undefined) updateFields.taxRate = taxRate;
      if (customRate !== undefined) updateFields.customRate = customRate;
      if (useSystemRate !== undefined) updateFields.useSystemRate = useSystemRate;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.get('/', [auth, authorize(['company-admin', 'super-admin'])], async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.put('/:id/status', [auth, authorize(['company-admin', 'super-admin'])], [
  body('isActive').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 등록 (관리자용)
router.post('/', [auth, authorize(['company-admin', 'super-admin'])], [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  body('role').isIn(['employee', 'manager', 'counselor', 'company-admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role, department, employeeId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: '이미 등록된 이메일입니다.' });
    }

    const user = new User({
      email,
      password,
      name,
      role,
      department,
      employeeId
    });

    await user.save();

    res.status(201).json({
      message: '사용자가 성공적으로 등록되었습니다.',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId
      }
    });
  } catch (error) {
    console.error('사용자 등록 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 통계 조회
router.get('/stats', [auth, authorize(['manager', 'company-admin', 'super-admin'])], async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalUsers = await User.countDocuments({ isActive: true });
    const activeUsers = await User.countDocuments({ isActive: true });

    res.json({
      totalUsers,
      activeUsers,
      roleStats: stats
    });
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;