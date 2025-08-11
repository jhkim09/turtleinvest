const mongoose = require('mongoose');
require('dotenv').config();

async function checkCounselors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');

    const db = mongoose.connection.db;
    
    // 상담사 역할 사용자들 확인
    console.log('\n👨‍⚕️ 상담사 역할 사용자들:');
    const counselorUsers = await db.collection('users').find({
      role: 'counselor'
    }).toArray();
    
    counselorUsers.forEach((user, i) => {
      console.log(`${i+1}. 이름: "${user.name}"`);
      console.log(`   이메일: ${user.email}`);
      console.log(`   활성: ${user.isActive}`);
      console.log('');
    });

    // Counselor 컬렉션 확인 (있는 경우)
    const collections = await db.listCollections().toArray();
    const hasCounselorCollection = collections.some(col => col.name === 'counselors');
    
    if (hasCounselorCollection) {
      console.log('\n🧠 Counselor 컬렉션:');
      const counselors = await db.collection('counselors').find({}).toArray();
      
      counselors.forEach((counselor, i) => {
        console.log(`${i+1}. 이름: "${counselor.name}"`);
        console.log(`   전문분야: ${JSON.stringify(counselor.specialties)}`);
        console.log(`   이메일: ${counselor.email}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️ Counselor 컬렉션이 없습니다.');
    }

    await mongoose.disconnect();
    console.log('\n✅ 확인 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

checkCounselors();