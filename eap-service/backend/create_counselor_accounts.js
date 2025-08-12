const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function createCounselorAccounts() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('✅ MongoDB 연결 성공!');

    // 기존 상담사 계정 확인 및 삭제
    const existingPsychCounselor = await User.findOne({ email: 'psych@counselor.com' });
    const existingFinancialCounselor = await User.findOne({ email: 'financial@counselor.com' });
    
    if (existingPsychCounselor) {
      await User.deleteOne({ email: 'psych@counselor.com' });
      console.log('기존 심리상담사 계정 삭제됨');
    }
    
    if (existingFinancialCounselor) {
      await User.deleteOne({ email: 'financial@counselor.com' });
      console.log('기존 재무상담사 계정 삭제됨');
    }

    // 심리상담사 계정 생성 (User 모델의 pre-save hook이 자동으로 비밀번호를 해싱합니다)
    const psychCounselor = new User({
      name: '김심리',
      email: 'psych@counselor.com',
      password: 'password123',
      role: 'counselor',
      phone: '010-1111-2222',
      department: '상담센터',
      position: '심리상담사',
      // 상담사 전용 필드
      specialties: ['스트레스 관리', '대인관계', '우울증', '불안장애'],
      experience: 5,
      licenseNumber: 'PSY-2024-001',
      counselingCenterId: null,
      customRate: 60000,
      useSystemRate: false,
      taxRate: 3.3,
      isIndependent: true,
      totalSessions: 0,
      rating: 0,
      totalRatings: 0
    });

    await psychCounselor.save();
    console.log('✅ 심리상담사 계정 생성 완료!');
    console.log('   이메일: psych@counselor.com');
    console.log('   비밀번호: password123');

    // 재무상담사 계정 생성
    const financialCounselor = new User({
      name: '이재무',
      email: 'financial@counselor.com', 
      password: 'password123',
      role: 'financial-advisor',
      phone: '010-3333-4444',
      department: '재무상담센터',
      position: '재무상담사',
      // 상담사 전용 필드
      specialties: ['재무계획', '투자상담', '부채관리', '은퇴준비'],
      experience: 8,
      licenseNumber: 'FIN-2024-002',
      counselingCenterId: null,
      customRate: 80000,
      useSystemRate: false,
      taxRate: 3.3,
      isIndependent: true,
      totalSessions: 0,
      rating: 0,
      totalRatings: 0
    });

    await financialCounselor.save();
    console.log('✅ 재무상담사 계정 생성 완료!');
    console.log('   이메일: financial@counselor.com');
    console.log('   비밀번호: password123');

    console.log('\n🎯 테스트 계정 정보:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 심리상담사');
    console.log('   이메일: psych@counselor.com');
    console.log('   비밀번호: password123');
    console.log('   이름: 김심리');
    console.log('   전문분야: 스트레스 관리, 대인관계, 우울증, 불안장애');
    console.log('   경력: 5년');
    console.log('   상담료: 60,000원');
    console.log('');
    console.log('💰 재무상담사');  
    console.log('   이메일: financial@counselor.com');
    console.log('   비밀번호: password123');
    console.log('   이름: 이재무');
    console.log('   전문분야: 재무계획, 투자상담, 부채관리, 은퇴준비');
    console.log('   경력: 8년');
    console.log('   상담료: 80,000원');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ 계정 생성 실패:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
  }
}

createCounselorAccounts();