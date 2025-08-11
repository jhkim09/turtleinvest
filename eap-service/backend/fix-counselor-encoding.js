const mongoose = require('mongoose');
require('dotenv').config();

async function fixCounselorEncoding() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');

    const db = mongoose.connection.db;
    
    // 깨진 상담사 데이터 수정
    console.log('\n🔧 상담사 데이터 수정 중...');
    
    // Counselors 컬렉션의 깨진 데이터 수정
    const counselorFixes = [
      {
        email: 'financial@counselors.com',
        name: '박금융상담사',
        specialties: ['금융스트레스', '재무상담', '투자불안']
      }
    ];

    for (const fix of counselorFixes) {
      const result = await db.collection('counselors').updateOne(
        { email: fix.email },
        { $set: { 
          name: fix.name,
          specialties: fix.specialties
        }}
      );
      
      if (result.matchedCount > 0) {
        console.log(`✅ ${fix.email} → 이름: "${fix.name}", 전문분야: ${JSON.stringify(fix.specialties)} 수정 완료`);
      } else {
        console.log(`⚠️ ${fix.email} 상담사를 찾을 수 없음`);
      }
    }

    // 수정 결과 확인
    console.log('\n📋 수정 후 상담사 목록:');
    const counselors = await db.collection('counselors').find({}).toArray();
    counselors.forEach((counselor, i) => {
      console.log(`${i+1}. 이름: "${counselor.name}"`);
      console.log(`   전문분야: ${JSON.stringify(counselor.specialties)}`);
      console.log(`   이메일: ${counselor.email}`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('🎉 상담사 인코딩 수정 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

fixCounselorEncoding();