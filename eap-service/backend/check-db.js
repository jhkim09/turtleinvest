const mongoose = require('mongoose');
require('dotenv').config();

// 모델들 import
const User = require('./models/User');
const Counselor = require('./models/Counselor');
const CounselingSession = require('./models/CounselingSession');
const Appointment = require('./models/Appointment');

async function checkDatabase() {
  try {
    console.log('🔄 MongoDB에 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('✅ MongoDB 연결 성공!');

    console.log('\n📊 데이터베이스 현황:');
    
    // 사용자 목록
    const users = await User.find({}).select('name email role isActive');
    console.log(`👥 사용자 수: ${users.length}`);
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role} - ${user.isActive ? '활성' : '비활성'}`);
    });

    // 상담 세션 목록
    const sessions = await CounselingSession.find({})
      .populate('employee', 'name email')
      .populate('counselor', 'name email')
      .sort({ createdAt: -1 });
    console.log(`\n💬 상담 세션 수: ${sessions.length}`);
    sessions.forEach(session => {
      console.log(`  - ${session.employee?.name || 'Unknown'} → ${session.counselor?.name || 'Unassigned'}`);
      console.log(`    주제: ${session.topic}`);
      console.log(`    상태: ${session.status} / 배정: ${session.assignmentStatus}`);
      console.log(`    날짜: ${session.appointmentDate}`);
      console.log('');
    });

    // 예약 목록 (기존 appointments)
    const appointments = await Appointment.find({})
      .populate('employee', 'name email')
      .populate('counselor', 'name email')
      .sort({ createdAt: -1 });
    console.log(`📅 기존 예약 수: ${appointments.length}`);
    appointments.forEach(appointment => {
      console.log(`  - ${appointment.employee?.name || 'Unknown'} → ${appointment.counselor?.name || 'Unassigned'}`);
      console.log(`    날짜: ${appointment.scheduledDate}`);
      console.log(`    상태: ${appointment.status}`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

checkDatabase();