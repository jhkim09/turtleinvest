const mongoose = require('mongoose');
require('dotenv').config();

async function simpleCheck() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');

    const db = mongoose.connection.db;
    
    // 컬렉션 목록
    const collections = await db.listCollections().toArray();
    console.log('\n📁 컬렉션 목록:');
    collections.forEach(col => console.log(`  - ${col.name}`));

    // 상담세션 데이터 직접 조회
    if (collections.find(col => col.name === 'counselingsessions')) {
      const sessions = await db.collection('counselingsessions').find({}).toArray();
      console.log(`\n💬 상담 세션 수: ${sessions.length}`);
      sessions.forEach(session => {
        console.log(`  - 주제: ${session.topic}`);
        console.log(`    상태: ${session.status} / 배정: ${session.assignmentStatus}`);
        console.log(`    직원ID: ${session.employee}`);
        console.log(`    상담사ID: ${session.counselor || 'None'}`);
        console.log(`    날짜: ${session.appointmentDate}`);
        console.log('');
      });
    }

    // 예약 데이터 직접 조회
    if (collections.find(col => col.name === 'appointments')) {
      const appointments = await db.collection('appointments').find({}).toArray();
      console.log(`📅 예약 수: ${appointments.length}`);
      appointments.forEach(appointment => {
        console.log(`  - 직원ID: ${appointment.employee}`);
        console.log(`    상담사ID: ${appointment.counselor || 'None'}`);
        console.log(`    날짜: ${appointment.scheduledDate}`);
        console.log(`    상태: ${appointment.status}`);
        console.log('');
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

simpleCheck();