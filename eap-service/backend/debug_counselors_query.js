const mongoose = require('mongoose');
const User = require('./models/User');
const CounselingCenter = require('./models/CounselingCenter');
require('dotenv').config();

async function debugCounselorsQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('MongoDB 연결 성공');

    console.log('=== 1. 전체 사용자 조회 ===');
    const allUsers = await User.find({}).select('name email role');
    console.log('총 사용자 수:', allUsers.length);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
    });

    console.log('\n=== 2. 상담사 역할 필터링 ===');
    const counselorRoleUsers = await User.find({ 
      role: { $in: ['counselor', 'financial-advisor'] }
    }).select('name email role');
    console.log('상담사 역할 사용자 수:', counselorRoleUsers.length);
    counselorRoleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
    });

    console.log('\n=== 3. API와 동일한 쿼리 테스트 ===');
    const page = 1;
    const limit = 10;
    const filter = {};
    
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

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('오류:', error);
    process.exit(1);
  }
}

debugCounselorsQuery();