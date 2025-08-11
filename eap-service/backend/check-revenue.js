const mongoose = require('mongoose');
const CounselingSession = require('./models/CounselingSession');

async function checkRevenue() {
  try {
    require('dotenv').config();
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    
    console.log('=== 월 매출 현황 ===');
    
    const currentMonth = new Date().getMonth() + 1; // 8월
    const currentYear = new Date().getFullYear(); // 2025
    
    console.log(`현재 년월: ${currentYear}년 ${currentMonth}월`);
    
    // 전체 상담 세션
    const totalSessions = await CounselingSession.countDocuments();
    console.log('전체 상담 세션 수:', totalSessions);
    
    // 완료된 상담 세션
    const completedSessions = await CounselingSession.countDocuments({ status: 'completed' });
    console.log('완료된 상담 세션 수:', completedSessions);
    
    // 이번 달 완료된 상담 세션들
    const currentMonthSessions = await CounselingSession.find({
      status: 'completed',
      appointmentDate: {
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lt: new Date(currentYear, currentMonth, 1)
      }
    });
    
    console.log(`${currentMonth}월 완료된 상담 세션 수:`, currentMonthSessions.length);
    
    let totalRevenue = 0;
    console.log('=== 이번 달 완료된 세션들 ===');
    currentMonthSessions.forEach((session, i) => {
      console.log(`${i+1}. 날짜: ${session.appointmentDate.toLocaleDateString()}, 요금: ${session.counselorRate || 0}원`);
      totalRevenue += (session.counselorRate || 0);
    });
    
    console.log(`\n총 ${currentMonth}월 매출:`, totalRevenue, '원');
    
    // MongoDB Aggregation 결과와 비교
    const aggregationResult = await CounselingSession.aggregate([
      {
        $match: {
          status: 'completed',
          appointmentDate: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lt: new Date(currentYear, currentMonth, 1)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$counselorRate' }
        }
      }
    ]);
    
    const aggregatedRevenue = aggregationResult.length > 0 ? aggregationResult[0].totalRevenue : 0;
    console.log('Aggregation 결과:', aggregatedRevenue, '원');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('오류:', error);
  }
}

checkRevenue();