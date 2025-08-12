const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixKimJaemuRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('MongoDB 연결 성공');

    // 김재무 사용자 찾아서 role을 financial-advisor로 변경
    const result = await User.updateOne(
      { email: 'tax@han.com', name: '김재무' },
      { role: 'financial-advisor' }
    );

    console.log('김재무 role 수정 결과:', result);

    // 확인
    const updatedUser = await User.findOne({ email: 'tax@han.com' });
    console.log('수정된 사용자:', {
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role
    });

    await mongoose.disconnect();
    console.log('✅ 김재무 역할이 financial-advisor로 수정되었습니다.');
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

fixKimJaemuRole();