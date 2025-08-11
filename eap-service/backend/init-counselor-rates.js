const mongoose = require('mongoose');
require('dotenv').config();

async function initCounselorRates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');

    const db = mongoose.connection.db;
    
    // 모든 상담사 조회
    const counselors = await db.collection('users').find({ role: 'counselor' }).toArray();
    
    console.log(`\n🔧 ${counselors.length}명의 상담사 단가 설정 초기화 중...`);
    
    for (const counselor of counselors) {
      // 단가 설정이 없는 상담사들에게 기본값 설정
      if (counselor.useSystemRate === undefined) {
        await db.collection('users').updateOne(
          { _id: counselor._id },
          { 
            $set: { 
              useSystemRate: true,
              customRate: 50000
            } 
          }
        );
        
        console.log(`✅ ${counselor.name} (${counselor.email}) - 단가 설정 초기화 완료`);
      } else {
        console.log(`⚠️ ${counselor.name} (${counselor.email}) - 이미 단가 설정 존재`);
      }
    }

    // 초기화 결과 확인
    console.log('\n📋 초기화 후 상담사 단가 설정:');
    const updatedCounselors = await db.collection('users')
      .find({ role: 'counselor' })
      .project({ name: 1, email: 1, useSystemRate: 1, customRate: 1 })
      .toArray();
      
    updatedCounselors.forEach((counselor, i) => {
      const rateDisplay = counselor.useSystemRate 
        ? '시스템 기본 단가 (50,000원)'
        : `개별 단가 (${counselor.customRate?.toLocaleString()}원)`;
        
      console.log(`${i+1}. ${counselor.name} - ${rateDisplay}`);
    });

    await mongoose.disconnect();
    console.log('\n🎉 상담사 단가 설정 초기화 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

initCounselorRates();