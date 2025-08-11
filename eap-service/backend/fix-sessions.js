const mongoose = require('mongoose');
require('dotenv').config();

async function fixSessions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');

    const db = mongoose.connection.db;
    
    // 깨진 세션 주제들 수정
    const sessions = await db.collection('counselingsessions').find({}).toArray();
    
    console.log('\n🔧 상담 세션 주제 수정 중...');
    
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      let newTopic = session.topic;
      
      // 깨진 주제를 의미있는 주제로 변경
      if (session.topic && session.topic.includes('�')) {
        const topics = ['스트레스 관리', '업무 관련 상담', '대인관계 상담', '진로 상담'];
        newTopic = topics[i % topics.length];
        
        await db.collection('counselingsessions').updateOne(
          { _id: session._id },
          { $set: { topic: newTopic } }
        );
        
        console.log(`✅ 세션 ${i+1}: "${session.topic}" → "${newTopic}" 수정 완료`);
      } else {
        console.log(`✅ 세션 ${i+1}: "${session.topic}" 정상`);
      }
    }

    // 수정 결과 확인
    console.log('\n📋 수정 후 세션 목록:');
    const updatedSessions = await db.collection('counselingsessions').find({}).toArray();
    updatedSessions.forEach((session, i) => {
      console.log(`${i+1}. 주제: ${session.topic} | 상태: ${session.status}`);
    });

    await mongoose.disconnect();
    console.log('\n🎉 세션 수정 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

fixSessions();