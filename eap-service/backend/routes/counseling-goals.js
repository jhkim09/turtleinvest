const express = require('express');
const { body, validationResult } = require('express-validator');
const CounselingGoal = require('../models/CounselingGoal');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 직원의 목표 목록 조회
router.get('/my-goals', auth, async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = { employee: req.user._id };
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    const goals = await CounselingGoal.find(filter)
      .populate('counselor', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      goals,
      summary: {
        total: goals.length,
        active: goals.filter(g => g.status === 'active').length,
        completed: goals.filter(g => g.status === 'completed').length,
        averageProgress: goals.length > 0 
          ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
          : 0
      }
    });
  } catch (error) {
    console.error('목표 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 상담사의 담당 직원 목표 조회
router.get('/counselor-goals', [auth, authorize(['counselor', 'financial-advisor'])], async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const filter = { counselor: req.user._id };
    
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;
    
    const goals = await CounselingGoal.find(filter)
      .populate('employee', 'name email department')
      .sort({ createdAt: -1 });
    
    res.json({ goals });
  } catch (error) {
    console.error('상담사 목표 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 목표 생성 (상담사가 직원에게 목표 부여)
router.post('/', [auth, authorize(['counselor', 'financial-advisor'])], [
  body('employeeId').isMongoId().withMessage('유효한 직원 ID가 필요합니다.'),
  body('title').trim().isLength({ min: 2, max: 100 }).withMessage('목표 제목은 2-100자여야 합니다.'),
  body('description').trim().isLength({ min: 10, max: 500 }).withMessage('목표 설명은 10-500자여야 합니다.'),
  body('category').isIn(['mental-health', 'stress-management', 'work-life-balance', 'financial-planning', 'investment', 'saving', 'debt-management', 'career-development', 'skill-improvement', 'relationship', 'other']).withMessage('유효한 카테고리를 선택해주세요.'),
  body('targetValue').trim().notEmpty().withMessage('목표값이 필요합니다.'),
  body('unit').trim().notEmpty().withMessage('단위가 필요합니다.'),
  body('targetDate').isISO8601().withMessage('유효한 목표 날짜가 필요합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      employeeId,
      relatedSessionId,
      sessionType,
      title,
      description,
      category,
      targetValue,
      unit,
      targetDate,
      actionSteps,
      priority,
      counselorNotes
    } = req.body;

    // 직원 존재 확인
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      return res.status(400).json({ message: '유효한 직원이 아닙니다.' });
    }

    const goal = new CounselingGoal({
      employee: employeeId,
      counselor: req.user._id,
      relatedSession: relatedSessionId,
      sessionType: sessionType,
      title,
      description,
      category,
      targetValue,
      unit,
      targetDate: new Date(targetDate),
      actionSteps: actionSteps || [],
      priority: priority || 'medium',
      counselorNotes
    });

    await goal.save();
    await goal.populate('employee', 'name email');

    res.status(201).json({
      message: '목표가 성공적으로 생성되었습니다.',
      goal
    });
  } catch (error) {
    console.error('목표 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 목표 진행상황 업데이트 (직원이 업데이트)
router.put('/:goalId/progress', auth, [
  body('currentValue').trim().notEmpty().withMessage('현재값이 필요합니다.'),
  body('note').optional().trim().isLength({ max: 200 }).withMessage('메모는 200자 이하여야 합니다.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { goalId } = req.params;
    const { currentValue, note } = req.body;

    const goal = await CounselingGoal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: '목표를 찾을 수 없습니다.' });
    }

    // 본인의 목표만 업데이트 가능
    if (goal.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    goal.updateProgress(currentValue, note, 'employee');
    await goal.save();

    res.json({
      message: '진행상황이 업데이트되었습니다.',
      goal
    });
  } catch (error) {
    console.error('진행상황 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 액션 스텝 완료 토글
router.put('/:goalId/action-step/:stepIndex', auth, async (req, res) => {
  try {
    const { goalId, stepIndex } = req.params;
    const { isCompleted } = req.body;

    const goal = await CounselingGoal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: '목표를 찾을 수 없습니다.' });
    }

    // 본인의 목표만 수정 가능
    if (goal.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    if (stepIndex >= goal.actionSteps.length) {
      return res.status(400).json({ message: '유효하지 않은 스텝 인덱스입니다.' });
    }

    goal.actionSteps[stepIndex].isCompleted = isCompleted;
    if (isCompleted) {
      goal.actionSteps[stepIndex].completedAt = new Date();
    } else {
      goal.actionSteps[stepIndex].completedAt = undefined;
    }

    // 액션 스텝 완료율로 전체 진행률 업데이트
    goal.progress = goal.getActionStepCompletion();
    if (goal.progress >= 100) {
      goal.status = 'completed';
    }

    await goal.save();

    res.json({
      message: '액션 스텝이 업데이트되었습니다.',
      goal
    });
  } catch (error) {
    console.error('액션 스텝 업데이트 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 목표 수정 (상담사만 가능)
router.put('/:goalId', [auth, authorize(['counselor', 'financial-advisor'])], async (req, res) => {
  try {
    const { goalId } = req.params;
    const updates = req.body;

    const goal = await CounselingGoal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: '목표를 찾을 수 없습니다.' });
    }

    // 본인이 생성한 목표만 수정 가능
    if (goal.counselor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const allowedFields = ['title', 'description', 'targetValue', 'unit', 'targetDate', 'actionSteps', 'priority', 'counselorNotes', 'status'];
    const updateFields = {};

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields[field] = updates[field];
      }
    });

    Object.assign(goal, updateFields);
    await goal.save();

    res.json({
      message: '목표가 수정되었습니다.',
      goal
    });
  } catch (error) {
    console.error('목표 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 목표 삭제 (상담사만 가능)
router.delete('/:goalId', [auth, authorize(['counselor', 'financial-advisor'])], async (req, res) => {
  try {
    const { goalId } = req.params;

    const goal = await CounselingGoal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: '목표를 찾을 수 없습니다.' });
    }

    // 본인이 생성한 목표만 삭제 가능
    if (goal.counselor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    await CounselingGoal.findByIdAndDelete(goalId);

    res.json({ message: '목표가 삭제되었습니다.' });
  } catch (error) {
    console.error('목표 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;