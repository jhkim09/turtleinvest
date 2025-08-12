const mongoose = require('mongoose');
const User = require('./models/User');
const FinancialProfile = require('./models/FinancialProfile');
require('dotenv').config();

async function createTestFinancialProfile() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 연결 성공');
    
    // 계정들 확인
    const employee = await User.findOne({ email: 'employee@test.com' });
    const financialAdvisor = await User.findOne({ email: 'financial@test.com' });
    
    if (!employee) {
      console.log('❌ 직원 계정이 없습니다.');
      return;
    }
    
    console.log('✅ 직원 계정 확인:', employee.name);
    
    // 기존 재무 프로필 삭제
    await FinancialProfile.deleteMany({ user: employee._id });
    console.log('기존 재무 프로필 삭제 완료');
    
    // 테스트 재무 프로필 생성
    const testProfile = new FinancialProfile({
      user: employee._id,
      financialAdvisor: financialAdvisor?._id,
      currentAssets: {
        cash: 5000000, // 500만원
        savings: 20000000, // 2000만원
        investments: 15000000, // 1500만원
        realEstate: 300000000, // 3억원
        other: 3000000 // 300만원
      },
      currentLiabilities: {
        creditCard: 2000000, // 200만원
        loans: 30000000, // 3000만원 (전세자금대출)
        mortgage: 0,
        other: 500000 // 50만원
      },
      monthlyIncome: {
        salary: 4500000, // 450만원
        business: 0,
        investment: 300000, // 30만원 (배당금)
        other: 200000 // 20만원 (부업)
      },
      monthlyExpenses: {
        living: 1500000, // 150만원 (생활비)
        housing: 1000000, // 100만원 (관리비, 공과금)
        insurance: 400000, // 40만원 (보험료)
        education: 200000, // 20만원 (자기계발)
        other: 500000 // 50만원 (기타)
      },
      financialGoals: [
        {
          title: '내 집 마련',
          targetAmount: 500000000, // 5억원
          currentAmount: 150000000, // 1.5억원 (기존 적금 + 투자)
          targetDate: new Date(Date.now() + 3*365*24*60*60*1000), // 3년 후
          priority: 'high',
          status: 'in-progress'
        },
        {
          title: '자녀 교육비 준비',
          targetAmount: 100000000, // 1억원
          currentAmount: 20000000, // 2000만원
          targetDate: new Date(Date.now() + 10*365*24*60*60*1000), // 10년 후
          priority: 'medium',
          status: 'in-progress'
        },
        {
          title: '은퇴 자금 마련',
          targetAmount: 2000000000, // 20억원
          currentAmount: 50000000, // 5000만원
          targetDate: new Date(Date.now() + 25*365*24*60*60*1000), // 25년 후
          priority: 'medium',
          status: 'planning'
        }
      ],
      riskProfile: 'moderate',
      investmentExperience: 'intermediate',
      notes: '재무상담사와 함께 작성한 포트폴리오입니다. 정기적인 검토와 조정이 필요합니다.',
      lastReviewDate: new Date(),
      isActive: true
    });
    
    await testProfile.save();
    console.log('✅ 테스트 재무 프로필 생성 완료');
    
    // 생성된 프로필 정보 출력
    const totalAssets = Object.values(testProfile.currentAssets).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = Object.values(testProfile.currentLiabilities).reduce((sum, val) => sum + val, 0);
    const netWorth = totalAssets - totalLiabilities;
    
    console.log('\n📊 재무 현황:');
    console.log(`총 자산: ${(totalAssets / 10000).toLocaleString()}만원`);
    console.log(`총 부채: ${(totalLiabilities / 10000).toLocaleString()}만원`);
    console.log(`순자산: ${(netWorth / 10000).toLocaleString()}만원`);
    console.log(`재무 목표: ${testProfile.financialGoals.length}개`);
    
    await mongoose.disconnect();
    console.log('\n작업 완료!');
    
  } catch (error) {
    console.error('❌ 오류:', error.message);
    await mongoose.disconnect();
  }
}

createTestFinancialProfile();