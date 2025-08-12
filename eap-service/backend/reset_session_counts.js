const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function resetSessionCounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('MongoDB 연결 성공');

    console.log('=== 상담사 세션 수 초기화 ===');
    
    // 모든 상담사의 totalSessions을 0으로 초기화
    const result = await User.updateMany(
      { role: { $in: ['counselor', 'financial-advisor'] } },
      { 
        totalSessions: 0,
        rating: 0,
        totalRatings: 0
      }
    );

    console.log(`${result.modifiedCount}명의 상담사 세션 수가 초기화되었습니다.`);
    console.log('실제 세션 완료 시 자동으로 카운트가 증가됩니다.');

    // 확인
    const counselors = await User.find({ 
      role: { $in: ['counselor', 'financial-advisor'] }
    }).select('name totalSessions rating');

    console.log('\n=== 초기화 후 상담사 현황 ===');
    counselors.forEach(counselor => {
      console.log(`${counselor.name}: ${counselor.totalSessions}회 세션, 평점 ${counselor.rating}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('오류:', error);
    process.exit(1);
  }
}

resetSessionCounts();