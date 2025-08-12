const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkCounselorAccounts() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('✅ MongoDB 연결 성공!');

    // 모든 상담사 계정 조회
    const counselors = await User.find({
      $or: [
        { role: 'counselor' },
        { role: 'financial-advisor' }
      ]
    });

    console.log('\n📋 등록된 상담사 계정들:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (counselors.length === 0) {
      console.log('❌ 등록된 상담사 계정이 없습니다.');
    } else {
      counselors.forEach((counselor, index) => {
        console.log(`${index + 1}. ${counselor.name} (${counselor.role})`);
        console.log(`   이메일: ${counselor.email}`);
        console.log(`   역할: ${counselor.role}`);
        console.log(`   전화: ${counselor.phone || 'N/A'}`);
        console.log(`   부서: ${counselor.department || 'N/A'}`);
        console.log(`   전문분야: ${counselor.specialties ? counselor.specialties.join(', ') : 'N/A'}`);
        console.log(`   경력: ${counselor.experience || 0}년`);
        console.log('   ─────────────────────────────');
      });
    }

    // 특정 이메일로 조회 테스트
    console.log('\n🔍 특정 계정 조회 테스트:');
    const psychCounselor = await User.findOne({ email: 'psych@counselor.com' });
    const financialCounselor = await User.findOne({ email: 'financial@counselor.com' });

    console.log('심리상담사 계정:', psychCounselor ? '✅ 존재함' : '❌ 없음');
    if (psychCounselor) {
      console.log(`   ID: ${psychCounselor._id}`);
      console.log(`   이름: ${psychCounselor.name}`);
      console.log(`   역할: ${psychCounselor.role}`);
    }

    console.log('재무상담사 계정:', financialCounselor ? '✅ 존재함' : '❌ 없음');
    if (financialCounselor) {
      console.log(`   ID: ${financialCounselor._id}`);
      console.log(`   이름: ${financialCounselor.name}`);
      console.log(`   역할: ${financialCounselor.role}`);
    }

  } catch (error) {
    console.error('❌ 조회 실패:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB 연결 종료');
  }
}

checkCounselorAccounts();