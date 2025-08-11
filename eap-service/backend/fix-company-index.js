const mongoose = require('mongoose');
require('dotenv').config();

async function fixCompanyIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');

    const db = mongoose.connection.db;
    const collection = db.collection('companies');
    
    // 기존 인덱스 조회
    const indexes = await collection.listIndexes().toArray();
    console.log('📋 기존 인덱스 목록:');
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // businessRegistrationNumber 인덱스 삭제
    try {
      await collection.dropIndex('businessRegistrationNumber_1');
      console.log('✅ businessRegistrationNumber 인덱스 삭제 완료');
    } catch (error) {
      console.log('⚠️ businessRegistrationNumber 인덱스 삭제 실패 (없거나 이미 삭제됨)');
    }

    // 새로운 sparse 인덱스 생성
    await collection.createIndex(
      { businessRegistrationNumber: 1 }, 
      { unique: true, sparse: true }
    );
    console.log('✅ businessRegistrationNumber sparse 인덱스 생성 완료');

    await mongoose.disconnect();
    console.log('\n🎉 인덱스 수정 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

fixCompanyIndex();