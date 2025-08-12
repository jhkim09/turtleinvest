const express = require('express');
const { body, validationResult } = require('express-validator');
const Resource = require('../models/Resource');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// 자료 목록 조회 (모든 사용자)
router.get('/', auth, async (req, res) => {
  try {
    const { 
      category, 
      search, 
      page = 1, 
      limit = 10, 
      sortBy = 'publishedAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    const query = {
      status: 'published',
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gte: new Date() } }
      ]
    };
    
    // 역할에 따른 공개 범위 필터링
    const visibilityFilter = [];
    visibilityFilter.push('all');
    
    if (req.user.role === 'employee') {
      visibilityFilter.push('employees-only');
    } else if (req.user.role === 'counselor') {
      visibilityFilter.push('counselors-only');
    } else if (req.user.role === 'financial-advisor') {
      visibilityFilter.push('advisors-only');
    }
    
    query.visibility = { $in: visibilityFilter };
    
    // 카테고리 필터
    if (category) {
      query.category = category;
    }
    
    // 검색
    if (search) {
      query.$text = { $search: search };
    }
    
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortOptions = {};
    sortOptions[sortBy] = sortDirection;
    
    // 고정 게시물 우선 정렬
    if (sortBy !== 'isPinned') {
      sortOptions.isPinned = -1;
    }
    
    const resources = await Resource.find(query)
      .populate('author', 'name role')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-content'); // 목록에서는 내용 제외
    
    const total = await Resource.countDocuments(query);
    
    res.json({
      resources,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      },
      categories: ['심리건강', '재무관리', '직장생활', '자기계발', '법률정보', '복리후생', '건강관리', '기타']
    });
  } catch (error) {
    console.error('자료 목록 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 특정 자료 조회
router.get('/:id', auth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('author', 'name role')
      .populate('likes.user', 'name');
    
    if (!resource) {
      return res.status(404).json({ message: '자료를 찾을 수 없습니다.' });
    }
    
    // 공개 범위 확인
    if (!resource.isVisibleTo(req.user.role)) {
      return res.status(403).json({ message: '이 자료에 접근할 권한이 없습니다.' });
    }
    
    // 조회수 증가
    await resource.incrementView();
    
    res.json(resource);
  } catch (error) {
    console.error('자료 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 자료 생성 (수퍼어드민만)
router.post('/', [auth, authorize(['super-admin'])], [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('제목은 5-200자여야 합니다.'),
  body('content').trim().isLength({ min: 10, max: 10000 }).withMessage('내용은 10-10000자여야 합니다.'),
  body('category').isIn(['심리건강', '재무관리', '직장생활', '자기계발', '법률정보', '복리후생', '건강관리', '기타']).withMessage('유효한 카테고리를 선택해주세요.'),
  body('visibility').optional().isIn(['all', 'employees-only', 'counselors-only', 'advisors-only']).withMessage('유효한 공개 범위를 선택해주세요.')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const {
      title,
      content,
      category,
      visibility = 'all',
      isPinned = false,
      links = [],
      tags = [],
      priority = 'normal',
      expiresAt,
      allowComments = true
    } = req.body;
    
    const resource = new Resource({
      title,
      content,
      category,
      visibility,
      isPinned,
      links,
      tags,
      priority,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      allowComments,
      author: req.user._id
    });
    
    await resource.save();
    await resource.populate('author', 'name role');
    
    res.status(201).json({
      message: '자료가 성공적으로 등록되었습니다.',
      resource
    });
  } catch (error) {
    console.error('자료 생성 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 자료 수정 (수퍼어드민만)
router.put('/:id', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: '자료를 찾을 수 없습니다.' });
    }
    
    const allowedFields = ['title', 'content', 'category', 'visibility', 'isPinned', 'links', 'tags', 'priority', 'expiresAt', 'allowComments', 'status'];
    const updateFields = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });
    
    if (updateFields.expiresAt) {
      updateFields.expiresAt = new Date(updateFields.expiresAt);
    }
    
    Object.assign(resource, updateFields);
    await resource.save();
    await resource.populate('author', 'name role');
    
    res.json({
      message: '자료가 수정되었습니다.',
      resource
    });
  } catch (error) {
    console.error('자료 수정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 자료 삭제 (수퍼어드민만)
router.delete('/:id', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: '자료를 찾을 수 없습니다.' });
    }
    
    res.json({ message: '자료가 삭제되었습니다.' });
  } catch (error) {
    console.error('자료 삭제 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 좋아요 토글
router.post('/:id/like', auth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: '자료를 찾을 수 없습니다.' });
    }
    
    // 공개 범위 확인
    if (!resource.isVisibleTo(req.user.role)) {
      return res.status(403).json({ message: '이 자료에 접근할 권한이 없습니다.' });
    }
    
    await resource.toggleLike(req.user._id);
    
    res.json({
      message: '좋아요가 업데이트되었습니다.',
      likesCount: resource.likes.length,
      isLiked: resource.likes.some(like => like.user.toString() === req.user._id.toString())
    });
  } catch (error) {
    console.error('좋아요 토글 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 통계 조회 (수퍼어드민만)
router.get('/admin/stats', [auth, authorize(['super-admin'])], async (req, res) => {
  try {
    const totalResources = await Resource.countDocuments({ status: 'published' });
    
    const categoryStats = await Resource.aggregate([
      { $match: { status: 'published' } },
      { 
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalLikes: { $sum: { $size: '$likes' } }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    const recentViews = await Resource.find({ status: 'published' })
      .sort({ viewCount: -1 })
      .limit(5)
      .select('title viewCount category')
      .populate('author', 'name');
    
    res.json({
      totalResources,
      categoryStats,
      recentViews
    });
  } catch (error) {
    console.error('자료실 통계 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;