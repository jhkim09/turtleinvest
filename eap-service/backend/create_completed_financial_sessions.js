const mongoose = require('mongoose');
const User = require('./models/User');
const FinancialSession = require('./models/FinancialSession');
require('dotenv').config();

async function createCompletedFinancialSessions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 연결 성공');
    
    // 계정들 확인
    const employee = await User.findOne({ email: 'employee@test.com' });
    const financialAdvisor = await User.findOne({ email: 'financial@test.com' });
    
    if (!employee || !financialAdvisor) {
      console.log('❌ 필요한 계정이 없습니다.');
      return;
    }
    
    console.log('✅ 직원 계정 확인:', employee.name);
    console.log('✅ 재무상담사 계정 확인:', financialAdvisor.name);
    
    // 완료된 재무상담 세션 생성
    const completedSessions = [
      {
        client: employee._id,
        financialAdvisor: financialAdvisor._id,
        scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7일 전
        duration: 60,
        sessionType: 'portfolio-review',
        format: 'video-call',
        status: 'completed',
        preparation: {
          documentsRequested: ['급여명세서', '투자내역서'],
          questionsToDiscuss: ['포트폴리오 재구성', '위험관리 방안'],
          clientPreparation: '현재 투자 현황과 목표 수익률을 정리해 주세요.'
        },
        sessionRecord: {
          sharedContent: {
            mainTopics: ['현재 포트폴리오 분석', '리스크 관리 방안', '분산투자 전략'],
            currentSituation: '현재 주식 비중이 높아 위험도가 높은 상황입니다.',
            clientConcerns: ['시장 변동성에 대한 우려', '안정적인 수익 추구'],
            generalRecommendations: [
              '주식:채권 비율을 7:3으로 조정',
              '해외 ETF 투자 확대',
              '정기적인 포트폴리오 리밸런싱'
            ],
            actionItems: [
              '고위험 주식 일부 매도',
              '안정적인 채권형 펀드 매수',
              '월 20만원 정기적금 시작'
            ],
            followUpNeeded: true,
            nextSessionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            sessionSummary: '고객의 포트폴리오를 분석하고 위험도를 낮추는 방향으로 재구성 계획을 수립했습니다.'
          }
        },
        materialsProvided: [
          {
            title: '포트폴리오 분석 리포트',
            type: 'report',
            description: '현재 투자 현황과 개선 방안을 담은 리포트'
          },
          {
            title: '추천 투자상품 목록',
            type: 'guide',
            description: '고객 성향에 맞는 투자상품 추천 리스트'
          }
        ],
        fee: {
          amount: 100000,
          currency: 'KRW',
          paymentStatus: 'paid'
        }
      },
      {
        client: employee._id,
        financialAdvisor: financialAdvisor._id,
        scheduledDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14일 전
        duration: 90,
        sessionType: 'retirement-planning',
        format: 'in-person',
        status: 'completed',
        preparation: {
          documentsRequested: ['국민연금 가입내역', '퇴직연금 현황'],
          questionsToDiscuss: ['은퇴 후 생활비', '연금 수령 방법'],
          clientPreparation: '은퇴 후 계획하는 생활 수준과 예상 지출을 정리해 주세요.'
        },
        sessionRecord: {
          sharedContent: {
            mainTopics: ['은퇴 자금 목표 설정', '연금 최적화 방안', '세제 혜택 활용'],
            currentSituation: '현재 연금 준비가 부족하여 추가적인 노후 대비가 필요합니다.',
            clientConcerns: ['은퇴 후 생활비 부족', '의료비 증가'],
            generalRecommendations: [
              '개인연금 가입 확대',
              '연금저축계좌 한도 활용',
              '부동산 투자 검토'
            ],
            actionItems: [
              'IRP 계좌 개설',
              '연금저축펀드 월 30만원 납입',
              '건강보험 검토 및 보완'
            ],
            followUpNeeded: true,
            sessionSummary: '은퇴 목표 시점까지 필요한 자금 규모를 산정하고 단계별 준비 계획을 수립했습니다.'
          }
        },
        materialsProvided: [
          {
            title: '은퇴설계 보고서',
            type: 'report',
            description: '개인별 은퇴 자금 필요액과 준비 방안'
          },
          {
            title: '연금상품 비교표',
            type: 'calculator',
            description: '다양한 연금상품의 수익률과 세제혜택 비교'
          }
        ],
        clientFeedback: {
          rating: 5,
          comments: '매우 상세하고 이해하기 쉽게 설명해주셔서 감사합니다. 은퇴 준비에 대한 구체적인 방향을 잡을 수 있었습니다.',
          wouldRecommend: true
        },
        fee: {
          amount: 150000,
          currency: 'KRW',
          paymentStatus: 'paid'
        }
      },
      {
        client: employee._id,
        financialAdvisor: financialAdvisor._id,
        scheduledDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21일 전
        duration: 60,
        sessionType: 'tax-planning',
        format: 'video-call',
        status: 'completed',
        preparation: {
          documentsRequested: ['소득금액증명원', '부동산 등기부등본'],
          questionsToDiscuss: ['절세 방안', '연말정산 최적화'],
          clientPreparation: '작년 연말정산 결과와 올해 소득 변화를 정리해 주세요.'
        },
        sessionRecord: {
          sharedContent: {
            mainTopics: ['소득공제 최적화', '세액공제 활용', '부동산 세금 절약'],
            currentSituation: '현재 소득공제를 충분히 활용하지 못하고 있는 상황입니다.',
            clientConcerns: ['높은 세금 부담', '복잡한 세법'],
            generalRecommendations: [
              '연금저축 한도 확대',
              '청약저축 활용',
              '부동산 취득세 감면 검토'
            ],
            actionItems: [
              '연금저축 월 50만원으로 증액',
              '주택청약종합저축 가입',
              '의료비 영수증 체계적 관리'
            ],
            followUpNeeded: false,
            sessionSummary: '현재 소득 수준에서 활용 가능한 모든 공제 혜택을 검토하고 최적화 방안을 제시했습니다.'
          }
        },
        materialsProvided: [
          {
            title: '절세 가이드북',
            type: 'guide',
            description: '직장인을 위한 실용적인 절세 방법 안내서'
          }
        ],
        clientFeedback: {
          rating: 4,
          comments: '세금에 대한 어려운 내용을 쉽게 설명해주셨고, 실제로 적용할 수 있는 방법들을 알려주셔서 도움이 되었습니다.',
          wouldRecommend: true
        },
        fee: {
          amount: 80000,
          currency: 'KRW',
          paymentStatus: 'paid'
        }
      }
    ];
    
    // 기존 완료된 세션이 있다면 삭제
    await FinancialSession.deleteMany({
      client: employee._id,
      status: 'completed'
    });
    console.log('기존 완료된 세션 삭제 완료');
    
    // 완료된 세션 생성
    for (let i = 0; i < completedSessions.length; i++) {
      const session = new FinancialSession(completedSessions[i]);
      await session.save();
      console.log(`✅ 완료된 재무상담 세션 ${i + 1} 생성: ${session.sessionType}`);
    }
    
    console.log(`\n✅ 총 ${completedSessions.length}개의 완료된 재무상담 세션이 생성되었습니다.`);
    
    // 생성된 세션 통계
    const totalCompleted = await FinancialSession.countDocuments({
      client: employee._id,
      status: 'completed'
    });
    
    const sessionsWithRating = await FinancialSession.countDocuments({
      client: employee._id,
      status: 'completed',
      'clientFeedback.rating': { $exists: true }
    });
    
    console.log('\n📊 생성된 세션 통계:');
    console.log(`완료된 세션 수: ${totalCompleted}개`);
    console.log(`평점 있는 세션: ${sessionsWithRating}개`);
    console.log(`평점 없는 세션: ${totalCompleted - sessionsWithRating}개`);
    
    await mongoose.disconnect();
    console.log('\n작업 완료!');
    
  } catch (error) {
    console.error('❌ 오류:', error.message);
    await mongoose.disconnect();
  }
}

createCompletedFinancialSessions();