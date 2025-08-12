const mongoose = require('mongoose');
const User = require('./models/User');
const CounselingCenter = require('./models/CounselingCenter');
require('dotenv').config();

async function checkCounselorFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('MongoDB 연결 성공');

    console.log('=== 상담사 상세 필드 확인 ===');
    const counselors = await User.find({ 
      role: { $in: ['counselor', 'financial-advisor'] }
    })
      .populate('counselingCenter', 'name')
      .sort({ createdAt: -1 });

    console.log(`총 ${counselors.length}명의 상담사 조회됨:`);
    
    counselors.forEach((counselor, index) => {
      console.log(`\n${index + 1}. ${counselor.name} (${counselor.role})`);
      console.log(`   이메일: ${counselor.email}`);
      console.log(`   전화번호: ${counselor.phone || 'undefined'}`);
      console.log(`   경력: ${counselor.experience || 'undefined'}년`);
      console.log(`   전문분야: ${counselor.specialties ? JSON.stringify(counselor.specialties) : 'undefined'}`);
      console.log(`   총 세션수: ${counselor.totalSessions || 'undefined'}`);
      console.log(`   평점: ${counselor.rating || 'undefined'}`);
      console.log(`   라이선스 번호: ${counselor.licenseNumber || 'undefined'}`);
      console.log(`   상담센터: ${counselor.counselingCenter?.name || '독립'}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('오류:', error);
    process.exit(1);
  }
}

checkCounselorFields();