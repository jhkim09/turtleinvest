const mongoose = require('mongoose');
require('dotenv').config();

async function checkNewAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');

    const db = mongoose.connection.db;
    
    // 새로 생성된 회사어드민 조회
    const admin = await db.collection('users').findOne({
      email: 'testadmin@test.com'
    });
    
    console.log('👤 새 회사어드민:');
    console.log('이메일:', admin.email);
    console.log('이름:', admin.name);
    console.log('역할:', admin.role);
    console.log('회사 ID:', admin.company);
    console.log('활성:', admin.isActive);
    
    // 연결된 회사 조회
    if (admin.company) {
      const company = await db.collection('companies').findOne({
        _id: admin.company
      });
      
      console.log('\n🏢 연결된 회사:');
      console.log('회사 ID:', company._id);
      console.log('회사명:', company.name);
      console.log('도메인:', company.domain);
      console.log('관리자 ID:', company.adminUser);
    } else {
      console.log('\n❌ 회사 연결이 없습니다!');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

checkNewAdmin();