const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function testCounselorCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('MongoDB 연결 성공');

    // 테스트 데이터 1 - 심리상담사
    const psychoCounselor = {
      name: '테스트 심리상담사',
      email: 'psycho-test@example.com',
      phone: '010-1234-5678',
      password: 'test123',
      role: 'counselor',
      customRate: 80000,
      useSystemRate: false,
      taxRate: 3.3,
      isIndependent: true
    };

    console.log('\n=== 심리상담사 생성 테스트 ===');
    console.log('데이터:', psychoCounselor);

    try {
      const newPsycho = new User(psychoCounselor);
      await newPsycho.save();
      console.log('✅ 심리상담사 생성 성공:', newPsycho._id);
      
      // 생성된 상담사 삭제
      await User.findByIdAndDelete(newPsycho._id);
      console.log('🗑️ 테스트 데이터 삭제 완료');
    } catch (error) {
      console.error('❌ 심리상담사 생성 실패:', error.message);
      if (error.errors) {
        console.error('세부 오류:', error.errors);
      }
    }

    // 테스트 데이터 2 - 재무상담사
    const financialCounselor = {
      name: '테스트 재무상담사',
      email: 'financial-test@example.com',
      phone: '010-1234-5679',
      password: 'test123',
      role: 'financial-advisor',
      customRate: 100000,
      useSystemRate: false,
      taxRate: 3.3,
      isIndependent: true
    };

    console.log('\n=== 재무상담사 생성 테스트 ===');
    console.log('데이터:', financialCounselor);

    try {
      const newFinancial = new User(financialCounselor);
      await newFinancial.save();
      console.log('✅ 재무상담사 생성 성공:', newFinancial._id);
      
      // 생성된 상담사 삭제
      await User.findByIdAndDelete(newFinancial._id);
      console.log('🗑️ 테스트 데이터 삭제 완료');
    } catch (error) {
      console.error('❌ 재무상담사 생성 실패:', error.message);
      if (error.errors) {
        console.error('세부 오류:', error.errors);
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('연결 오류:', error);
    process.exit(1);
  }
}

testCounselorCreation();