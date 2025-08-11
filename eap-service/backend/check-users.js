const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');

    const db = mongoose.connection.db;
    
    // 모든 사용자 조회
    const users = await db.collection('users').find({}).toArray();
    
    console.log('\n👥 사용자 목록:');
    users.forEach((user, i) => {
      console.log(`${i+1}. 이름: "${user.name}"`);
      console.log(`   이메일: ${user.email}`);
      console.log(`   역할: ${user.role}`);
      console.log(`   활성: ${user.isActive}`);
      console.log('');
    });

    // 수퍼어드민 계정 찾기
    const superAdmin = await db.collection('users').findOne({
      role: 'super-admin'
    });

    if (superAdmin) {
      console.log('👑 수퍼어드민 정보:');
      console.log(`이름: "${superAdmin.name}"`);
      console.log(`이메일: ${superAdmin.email}`);
      console.log(`이름 바이트 길이: ${Buffer.from(superAdmin.name, 'utf8').length}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

checkUsers();