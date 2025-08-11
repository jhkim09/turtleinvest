const mongoose = require('mongoose');
require('dotenv').config();

async function fixEncoding() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');

    const db = mongoose.connection.db;
    
    // 한글이 깨진 사용자들을 수정
    const fixes = [
      { email: 'superadmin@platform.com', name: '플랫폼관리자', role: 'super-admin' },
      { email: 'admin@example.com', name: '회사관리자', role: 'company-admin' },
      { email: 'employee@example.com', name: '테스트직원', role: 'employee' },
      { email: 'counselor@example.com', name: '김상담사', role: 'counselor' },
      { email: 'manager@abc.com', name: '박매니저', role: 'manager' },
      { email: 'counselor.kim@platform.com', name: '이상담사', role: 'counselor' }
    ];

    console.log('\n🔧 사용자 이름 수정 중...');
    
    for (const fix of fixes) {
      const result = await db.collection('users').updateOne(
        { email: fix.email },
        { $set: { name: fix.name } }
      );
      
      if (result.matchedCount > 0) {
        console.log(`✅ ${fix.email} → "${fix.name}" 수정 완료`);
      } else {
        console.log(`⚠️ ${fix.email} 사용자를 찾을 수 없음`);
      }
    }

    // 수정 결과 확인
    console.log('\n📋 수정 후 사용자 목록:');
    const users = await db.collection('users').find({}).toArray();
    users.forEach((user, i) => {
      console.log(`${i+1}. ${user.name} (${user.email}) - ${user.role}`);
    });

    await mongoose.disconnect();
    console.log('\n🎉 인코딩 수정 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

fixEncoding();