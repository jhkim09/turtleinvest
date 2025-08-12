const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function updateSampleCounselor() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('MongoDB 연결 성공');

    // 김재무 업데이트
    const kimjaemu = await User.findOneAndUpdate(
      { email: 'tax@han.com' },
      {
        phone: '010-1234-5678',
        experience: 5,
        specialties: ['재무설계', '투자상담', '세무상담'],
        totalSessions: 15,
        rating: 4.8
      },
      { new: true }
    );

    console.log('김재무 업데이트 결과:', {
      name: kimjaemu.name,
      phone: kimjaemu.phone,
      experience: kimjaemu.experience,
      specialties: kimjaemu.specialties,
      totalSessions: kimjaemu.totalSessions,
      rating: kimjaemu.rating
    });

    // 박재무 업데이트
    const parkjaemu = await User.findOneAndUpdate(
      { email: 'financial@test.com' },
      {
        phone: '010-9876-5432',
        experience: 7,
        specialties: ['보험설계', '은퇴설계', '자산관리'],
        totalSessions: 23,
        rating: 4.5
      },
      { new: true }
    );

    console.log('박재무 업데이트 결과:', {
      name: parkjaemu.name,
      phone: parkjaemu.phone,
      experience: parkjaemu.experience,
      specialties: parkjaemu.specialties,
      totalSessions: parkjaemu.totalSessions,
      rating: parkjaemu.rating
    });

    // 김상담 (counselor@test.com) 업데이트  
    const kimcounselor = await User.findOneAndUpdate(
      { email: 'counselor@test.com' },
      {
        phone: '010-1111-2222',
        experience: 3,
        specialties: ['우울증상담', '불안장애', '스트레스관리'],
        totalSessions: 18,
        rating: 4.6
      },
      { new: true }
    );

    console.log('김상담 업데이트 결과:', {
      name: kimcounselor.name,
      phone: kimcounselor.phone,
      experience: kimcounselor.experience,
      specialties: kimcounselor.specialties,
      totalSessions: kimcounselor.totalSessions,
      rating: kimcounselor.rating
    });

    await mongoose.disconnect();
    console.log('✅ 샘플 상담사 데이터 업데이트 완료');
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

updateSampleCounselor();