const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createTestUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('MongoDB 연결 성공');

    // 상담사 계정 생성
    const counselor = new User({
      name: '김상담',
      email: 'counselor@test.com',
      password: 'password123',
      role: 'counselor',
      isActive: true,
      customRate: 50000,
      useSystemRate: false
    });

    // Super Admin 계정 생성
    const superAdmin = new User({
      name: '관리자',
      email: 'admin@test.com',
      password: 'admin123',
      role: 'super-admin',
      isActive: true
    });

    // 기존 계정 삭제 후 새로 생성
    await User.deleteOne({ email: 'counselor@test.com' });
    await User.deleteOne({ email: 'admin@test.com' });

    await counselor.save();
    await superAdmin.save();

    console.log('✅ 테스트 계정 생성 완료:');
    console.log('상담사: counselor@test.com / password123');
    console.log('관리자: admin@test.com / admin123');

    process.exit(0);
  } catch (error) {
    console.error('계정 생성 오류:', error);
    process.exit(1);
  }
}

createTestUsers();