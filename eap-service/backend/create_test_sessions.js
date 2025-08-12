const mongoose = require('mongoose');
const User = require('./models/User');
const CounselingSession = require('./models/CounselingSession');
const FinancialSession = require('./models/FinancialSession');
require('dotenv').config();

async function createTestSessions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 연결 성공');
    
    // 계정들 확인
    const employee = await User.findOne({ email: 'employee@test.com' });
    const counselor = await User.findOne({ email: 'counselor@test.com' });
    const financialAdvisor = await User.findOne({ email: 'financial@test.com' });
    
    if (!employee || !counselor || !financialAdvisor) {
      console.log('❌ 필요한 계정이 없습니다. create_test_user.js를 먼저 실행하세요.');
      return;
    }
    
    console.log('✅ 계정 확인 완료');
    
    // 기존 테스트 세션 삭제
    await CounselingSession.deleteMany({ 
      employee: employee._id,
      counselor: counselor._id 
    });
    await FinancialSession.deleteMany({ 
      client: employee._id,
      financialAdvisor: financialAdvisor._id 
    });
    console.log('기존 테스트 세션 삭제 완료');
    
    // 심리상담 세션 생성 (완료된 상담)
    const psychSession = new CounselingSession({
      employee: employee._id,
      counselor: counselor._id,
      company: '테스트회사',
      appointmentDate: new Date(Date.now() - 7*24*60*60*1000), // 7일 전
      duration: 60,
      status: 'completed',
      topic: '직장 스트레스 관리',
      sessionType: 'individual',
      counselingMethod: 'phoneVideo',
      urgencyLevel: 'medium',
      counselorRate: 50000,
      sessionRecord: {
        sharedContent: {
          sessionSummary: '직장에서의 스트레스 요인을 파악하고, 효과적인 대처 방안을 함께 모색했습니다. 특히 시간 관리와 우선순위 설정 방법에 대해 중점적으로 다뤘습니다.',
          generalTopics: [
            '스트레스 관리 기법',
            '시간 관리 방법',
            '건강한 업무 습관'
          ],
          copingStrategies: [
            '호흡법을 통한 즉각적 스트레스 완화',
            '업무 우선순위 매트릭스 활용',
            '정기적인 휴식 시간 확보'
          ],
          wellnessGoals: [
            '매일 10분 명상 실천',
            '주 3회 이상 운동하기',
            '충분한 수면 시간 확보'
          ],
          nextSteps: [
            '일일 명상 10분 실천하기',
            '우선순위 매트릭스 활용하여 업무 정리',
            '스트레스 수준 모니터링'
          ],
          followUpNeeded: true,
          nextSessionDate: new Date(Date.now() + 14*24*60*60*1000),
          progressNotes: '스트레스 인식 수준이 8/10에서 6/10으로 개선되었으며, 시간 관리에 대한 이해가 증진되었음'
        }
      }
    });
    
    // 재무상담 세션 생성 (완료된 상담)
    const financialSession = new FinancialSession({
      client: employee._id,
      financialAdvisor: financialAdvisor._id,
      scheduledDate: new Date(Date.now() - 3*24*60*60*1000), // 3일 전
      duration: 90,
      status: 'completed',
      sessionType: 'goal-planning',
      format: 'in-person',
      preparation: {
        reason: '은퇴 준비 및 자산 관리 계획',
        goals: ['은퇴자금 계획', '투자 포트폴리오 구성', '보험 검토']
      },
      sessionRecord: {
        mainTopics: [
          '현재 자산 현황 분석',
          '은퇴 목표 설정',
          '투자 포트폴리오 재구성 방안'
        ],
        recommendations: [
          '월 100만원 적금을 ETF 투자로 전환 검토',
          '생명보험 보장 금액 증액 필요',
          '비상자금 6개월치 확보 우선'
        ],
        sharedContent: {
          sessionSummary: '현재 자산 상황을 점검하고 은퇴 준비를 위한 체계적인 투자 계획을 수립했습니다. 특히 리스크 분산과 장기 투자 관점에서의 포트폴리오 구성에 대해 상세히 논의했습니다.',
          generalTopics: [
            '은퇴 자금 계획',
            '투자 포트폴리오 다양화',
            '보험 보장 최적화'
          ],
          nextSteps: [
            '비상자금 6개월치 확보하기',
            'ETF 투자 상품 비교 분석',
            '생명보험 증액 검토 및 신청'
          ],
          followUpNeeded: true,
          nextSessionDate: new Date(Date.now() + 30*24*60*60*1000).toISOString()
        }
      }
    });
    
    await psychSession.save();
    await financialSession.save();
    
    console.log('✅ 테스트 세션 생성 완료:');
    console.log('- 심리상담 세션 1개 (완료)');
    console.log('- 재무상담 세션 1개 (완료)');
    
    await mongoose.disconnect();
    console.log('작업 완료!');
    
  } catch (error) {
    console.error('❌ 오류:', error.message);
    await mongoose.disconnect();
  }
}

createTestSessions();