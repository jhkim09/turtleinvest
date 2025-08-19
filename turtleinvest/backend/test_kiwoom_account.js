require('dotenv').config();
const KiwoomService = require('./services/kiwoomService');

// 키움 계좌 조회 API 테스트
async function testKiwoomAccount() {
  console.log('🔍 키움 계좌 조회 API 테스트');
  console.log('==========================');
  
  try {
    // 먼저 인증
    const authSuccess = await KiwoomService.authenticate(process.env.KIWOOM_APP_KEY, process.env.KIWOOM_SECRET_KEY);
    
    if (authSuccess) {
      console.log('✅ 인증 성공, 계좌 조회 시도...');
      
      // 계좌 잔고 조회 테스트
      const accountData = await KiwoomService.getAccountBalance();
      
      console.log('\n📊 계좌 조회 결과:');
      console.log('총자산:', accountData?.totalAsset?.toLocaleString() || 'N/A', '원');
      console.log('현금:', accountData?.cash?.toLocaleString() || 'N/A', '원');
      console.log('보유종목:', accountData?.positions?.length || 0, '개');
      
      if (accountData?.positions && accountData.positions.length > 0) {
        console.log('\n📋 보유 종목:');
        accountData.positions.forEach(pos => {
          console.log(`  - ${pos.name} (${pos.symbol}): ${pos.quantity}주, 평가손익 ${pos.unrealizedPL?.toLocaleString()}원`);
        });
      }
      
      console.log('\n💡 키움 API 상태:');
      console.log('- 인증: ✅ 정상');
      console.log('- 계좌조회:', accountData && accountData.totalAsset ? '✅ 정상' : '❌ 실패 (시뮬레이션 사용)');
      
      // 키움 API 문제 원인 분석
      if (!accountData || !accountData.totalAsset) {
        console.log('\n🔍 500 오류 원인 분석:');
        console.log('1. 계좌 개설 필요: 실제 또는 모의투자 계좌');
        console.log('2. 권한 부족: 해당 계좌에 대한 조회 권한 없음');
        console.log('3. 시장 시간: 장외 시간에는 일부 API 제한');
        console.log('4. 약관 동의: 키움증권 API 이용약관 미동의');
        console.log('5. 계좌 연결: API Key와 실제 계좌 연결 필요');
      }
      
    } else {
      throw new Error('인증 실패');
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
}

testKiwoomAccount().then(() => {
  console.log('\n✅ 키움 API 테스트 완료');
  process.exit(0);
}).catch(error => {
  console.error('❌ 실패:', error);
  process.exit(1);
});