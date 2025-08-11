const mongoose = require('mongoose');
require('dotenv').config({ path: './eap-service/backend/.env' });

async function testMongoDBAtlas() {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri || uri.includes('<password>')) {
      console.log('❌ .env 파일의 MONGODB_URI를 먼저 설정하세요');
      console.log('💡 Atlas에서 받은 연결 문자열로 <password> 부분을 실제 비밀번호로 변경하세요');
      return;
    }
    
    console.log('🔄 MongoDB Atlas 연결 중...');
    await mongoose.connect(uri);
    
    console.log('✅ MongoDB Atlas 연결 성공!');
    console.log('📊 클러스터 정보:', {
      name: mongoose.connection.name,
      host: mongoose.connection.host,
      readyState: mongoose.connection.readyState
    });
    
    // 간단한 테스트
    const TestSchema = new mongoose.Schema({ 
      message: String,
      createdAt: { type: Date, default: Date.now }
    });
    const Test = mongoose.model('Test', TestSchema);
    
    const testDoc = new Test({ message: 'Hello MongoDB Atlas from EAP Service!' });
    const saved = await testDoc.save();
    
    console.log('✅ 데이터 저장 성공!');
    console.log('💾 저장된 문서:', { id: saved._id, message: saved.message });
    
    // 데이터 조회 테스트
    const count = await Test.countDocuments();
    console.log('📈 총 테스트 문서 수:', count);
    
    await mongoose.disconnect();
    console.log('🔌 MongoDB Atlas 연결 종료');
    console.log('🎉 MongoDB Atlas가 정상적으로 작동합니다!');
    
  } catch (error) {
    console.log('❌ MongoDB Atlas 연결 실패:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('💡 사용자명 또는 비밀번호를 확인하세요');
    } else if (error.message.includes('not allowed')) {
      console.log('💡 IP 화이트리스트를 확인하세요 (0.0.0.0/0 또는 현재 IP 추가)');
    } else {
      console.log('💡 연결 문자열이 올바른지 확인하세요');
    }
  }
}

testMongoDBAtlas();