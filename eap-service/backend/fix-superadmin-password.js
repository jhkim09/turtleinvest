const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixSuperAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');

    const db = mongoose.connection.db;
    
    // 새 비밀번호 해시 생성
    const newPassword = 'password123';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // 수퍼어드민 비밀번호 업데이트
    const result = await db.collection('users').updateOne(
      { email: 'superadmin@platform.com', role: 'super-admin' },
      { $set: { password: hashedPassword } }
    );
    
    if (result.matchedCount > 0) {
      console.log('✅ 수퍼어드민 비밀번호 재설정 완료!');
      console.log('📧 이메일: superadmin@platform.com');
      console.log('🔑 비밀번호: password123');
    } else {
      console.log('❌ 수퍼어드민 계정을 찾을 수 없습니다.');
    }

    // 모든 사용자 계정의 비밀번호도 동일하게 재설정 (테스트 편의)
    const users = await db.collection('users').find({}).toArray();
    console.log('\n🔧 모든 사용자 비밀번호를 "password123"으로 재설정 중...');
    
    for (const user of users) {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword } }
      );
      console.log(`✅ ${user.name} (${user.email}) - 비밀번호 재설정`);
    }

    await mongoose.disconnect();
    console.log('\n🎉 모든 계정 비밀번호 재설정 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

fixSuperAdminPassword();