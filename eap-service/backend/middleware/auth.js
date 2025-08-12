const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '토큰이 없습니다. 접근이 거부되었습니다.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: '비활성화된 계정입니다.' });
    }

    req.user = user;
    req.user.id = user._id.toString(); // 호환성을 위해 id 속성 추가
    next();
  } catch (error) {
    res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    next();
  };
};

module.exports = { auth, authorize };