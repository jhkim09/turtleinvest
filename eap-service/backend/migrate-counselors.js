const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function migrateCounselorsToIndependent() {
  try {
    console.log('🔄 MongoDB에 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('✅ MongoDB 연결 성공!');

    // 현재 상담사 목록 조회
    const counselors = await User.find({ role: 'counselor' });
    console.log(`\n📊 발견된 상담사 수: ${counselors.length}명`);

    if (counselors.length === 0) {
      console.log('마이그레이션할 상담사가 없습니다.');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    console.log('\n🔧 상담사 데이터 마이그레이션 중...');
    
    for (const counselor of counselors) {
      const updates = {};
      let needsUpdate = false;

      // 모든 상담사를 개인자격으로 강제 마이그레이션
      updates.isIndependent = true;
      needsUpdate = true;

      // counselingCenter 필드가 있다면 제거
      if (counselor.counselingCenter) {
        updates.counselingCenter = undefined;
      }

      if (needsUpdate) {
        await User.findByIdAndUpdate(counselor._id, { $unset: { counselingCenter: 1 }, $set: updates });
        console.log(`✅ ${counselor.name} (${counselor.email}) → 개인자격 상담사로 마이그레이션`);
        migratedCount++;
      } else {
        console.log(`⏭️  ${counselor.name} (${counselor.email}) → 이미 마이그레이션 완료`);
        skippedCount++;
      }
    }

    console.log('\n📈 마이그레이션 결과:');
    console.log(`✅ 성공: ${migratedCount}명`);
    console.log(`⏭️  건너뜀: ${skippedCount}명`);
    console.log(`📊 전체: ${counselors.length}명`);

    // 마이그레이션 후 상담사 상태 확인
    console.log('\n🔍 마이그레이션 후 상담사 상태 확인:');
    const updatedCounselors = await User.find({ role: 'counselor' }).select('name email isIndependent counselingCenter');
    
    updatedCounselors.forEach(counselor => {
      const status = counselor.isIndependent ? '개인자격' : '센터소속';
      const centerInfo = counselor.counselingCenter ? ` (센터: ${counselor.counselingCenter})` : '';
      console.log(`  - ${counselor.name} (${counselor.email}) → ${status}${centerInfo}`);
    });

    await mongoose.disconnect();
    console.log('\n🎉 상담사 마이그레이션 완료!');
    console.log('💡 이제 수퍼어드민 대시보드에서 상담센터를 생성하고 상담사들을 배정할 수 있습니다.');

  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error.message);
    process.exit(1);
  }
}

migrateCounselorsToIndependent();