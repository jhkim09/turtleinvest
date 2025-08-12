const mongoose = require('mongoose');
const User = require('./models/User');
const CounselingGoal = require('./models/CounselingGoal');
require('dotenv').config();

async function createTestUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('MongoDB 연결 성공');

    // 심리상담사 계정 생성
    const counselor = new User({
      name: '김상담',
      email: 'counselor@test.com',
      password: 'password123',
      role: 'counselor',
      phone: '010-1234-5678',
      isActive: true,
      customRate: 50000,
      useSystemRate: false
    });

    // 재무상담사 계정 생성
    const financialAdvisor = new User({
      name: '박재무',
      email: 'financial@test.com',
      password: 'password123',
      role: 'financial-advisor',
      phone: '010-2345-6789',
      isActive: true,
      customRate: 80000,
      useSystemRate: false
    });

    // Super Admin 계정 생성
    const superAdmin = new User({
      name: '관리자',
      email: 'admin@test.com',
      password: 'admin123',
      role: 'super-admin',
      phone: '010-0000-0000',
      isActive: true
    });

    // 기존 계정 삭제 후 새로 생성
    await User.deleteOne({ email: 'counselor@test.com' });
    await User.deleteOne({ email: 'financial@test.com' });
    await User.deleteOne({ email: 'admin@test.com' });

    await counselor.save();
    await financialAdvisor.save();
    await superAdmin.save();

    console.log('✅ 테스트 계정 생성 완료:');
    console.log('심리상담사: counselor@test.com / password123');
    console.log('재무상담사: financial@test.com / password123');
    console.log('관리자: admin@test.com / admin123');

    // 직원 계정 확인
    const employee = await User.findOne({ email: 'employee@test.com' });
    if (employee) {
      console.log('\n테스트 목표 생성 중...');
      
      // 기존 목표 삭제
      await CounselingGoal.deleteMany({ employee: employee._id });
      
      const testGoals = [
        // 심리상담 목표
        {
          employee: employee._id,
          counselor: counselor._id,
          sessionType: 'Appointment',
          title: '스트레스 관리 개선',
          description: '일일 스트레스 수준을 체크하고 관리 방법을 실천하기',
          category: 'stress-management',
          targetValue: '7',
          unit: '일/주',
          currentValue: '3',
          targetDate: new Date(Date.now() + 30*24*60*60*1000), // 30일 후
          actionSteps: [
            { step: '매일 스트레스 수준 체크하기', isCompleted: true },
            { step: '주 3회 이상 명상하기', isCompleted: false },
            { step: '업무 시간 관리 방법 실천하기', isCompleted: false }
          ],
          priority: 'high',
          status: 'active'
        },
        {
          employee: employee._id,
          counselor: counselor._id,
          sessionType: 'Appointment',
          title: '업무-생활 균형 개선',
          description: '업무와 개인시간의 균형을 맞춰 삶의 질 향상하기',
          category: 'work-life-balance',
          targetValue: '5',
          unit: '시간/일',
          currentValue: '2',
          targetDate: new Date(Date.now() + 60*24*60*60*1000), // 60일 후
          actionSteps: [
            { step: '퇴근 후 업무 관련 연락 차단하기', isCompleted: false },
            { step: '주말 취미활동 시간 확보하기', isCompleted: true },
            { step: '가족과의 시간 늘리기', isCompleted: false }
          ],
          priority: 'medium',
          status: 'active'
        },
        // 재무상담 목표
        {
          employee: employee._id,
          counselor: financialAdvisor._id,
          sessionType: 'FinancialSession',
          title: '비상자금 마련',
          description: '월 생활비 6개월분에 해당하는 비상자금 적립하기',
          category: 'saving',
          targetValue: '12000000',
          unit: '원',
          currentValue: '5000000',
          targetDate: new Date(Date.now() + 365*24*60*60*1000), // 1년 후
          actionSteps: [
            { step: '매월 100만원씩 적금 넣기', isCompleted: true },
            { step: '가계부 작성하여 지출 관리하기', isCompleted: true },
            { step: '부수입원 찾기', isCompleted: false }
          ],
          priority: 'high',
          status: 'active'
        },
        {
          employee: employee._id,
          counselor: financialAdvisor._id,
          sessionType: 'FinancialSession',
          title: '투자 포트폴리오 구성',
          description: '리스크 분산을 위한 균형잡힌 투자 포트폴리오 구성하기',
          category: 'investment',
          targetValue: '3',
          unit: '종목',
          currentValue: '1',
          targetDate: new Date(Date.now() + 90*24*60*60*1000), // 90일 후
          actionSteps: [
            { step: '투자 성향 분석 완료하기', isCompleted: true },
            { step: '안정적인 채권형 펀드 선택하기', isCompleted: false },
            { step: '국내외 주식 비중 결정하기', isCompleted: false }
          ],
          priority: 'medium',
          status: 'active'
        }
      ];

      const createdGoals = await CounselingGoal.insertMany(testGoals);
      console.log(`✅ ${createdGoals.length}개의 테스트 목표 생성 완료`);
    }

    process.exit(0);
  } catch (error) {
    console.error('계정 생성 오류:', error);
    process.exit(1);
  }
}

createTestUsers();