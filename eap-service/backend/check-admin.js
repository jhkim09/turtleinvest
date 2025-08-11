const mongoose = require('mongoose');
require('dotenv').config();

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');

    const db = mongoose.connection.db;
    
    // 수퍼어드민 계정 찾기
    const admins = await db.collection('users').find({
      role: 'super-admin'
    }).toArray();

    console.log('\n👑 수퍼어드민 계정:');
    if (admins.length > 0) {
      admins.forEach(admin => {
        console.log(`  - 이름: ${admin.name}`);
        console.log(`    이메일: ${admin.email}`);
        console.log(`    활성: ${admin.isActive ? '활성' : '비활성'}`);
        console.log('');
      });
    } else {
      console.log('  수퍼어드민 계정이 없습니다. 새로 생성합니다...');
      
      // 수퍼어드민 계정 생성
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newAdmin = {
        name: '플랫폼 관리자',
        email: 'admin@eapservice.com',
        password: hashedPassword,
        role: 'super-admin',
        isActive: true,
        createdAt: new Date()
      };
      
      await db.collection('users').insertOne(newAdmin);
      console.log('✅ 수퍼어드민 계정이 생성되었습니다!');
      console.log(`   이메일: admin@eapservice.com`);
      console.log(`   비밀번호: admin123`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

checkAdmin();