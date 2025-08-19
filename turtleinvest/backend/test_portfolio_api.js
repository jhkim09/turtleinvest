require('dotenv').config();
const KiwoomService = require('./services/kiwoomService');

// 포트폴리오 API 로직 테스트
async function testPortfolioAPI() {
  console.log('🔍 포트폴리오 API 직접 테스트');
  console.log('==========================');
  
  try {
    console.log('1. 키움 API 인증 시도...');
    
    if (!KiwoomService.isConnectedToKiwoom()) {
      await KiwoomService.authenticate(process.env.KIWOOM_APP_KEY, process.env.KIWOOM_SECRET_KEY);
    }
    
    console.log('키움 연결상태:', KiwoomService.isConnectedToKiwoom());
    
    if (KiwoomService.isConnectedToKiwoom()) {
      console.log('2. 키움 계좌 조회...');
      const kiwoomData = await KiwoomService.getAccountBalance();
      
      console.log('키움 계좌 데이터:');
      console.log('- totalAsset:', kiwoomData?.totalAsset);
      console.log('- cash:', kiwoomData?.cash);
      console.log('- positions 길이:', kiwoomData?.positions?.length);
      
      if (kiwoomData?.positions) {
        kiwoomData.positions.forEach(pos => {
          console.log(`  보유종목: ${pos.name} (${pos.symbol}) ${pos.quantity}주`);
        });
      }
      
      console.log('\n3. 프론트엔드 전송 데이터:');
      console.log('currentCash:', kiwoomData.cash);
      console.log('totalEquity:', kiwoomData.totalAsset);
      console.log('portfolioValue:', kiwoomData.totalAsset);
      
      console.log('\n✅ 키움 API 데이터가 정상적으로 준비됨');
      console.log('프론트엔드에서 다음과 같이 표시되어야 함:');
      console.log(`- 총 자산: ₩${kiwoomData.totalAsset?.toLocaleString()}`);
      console.log(`- 현금: ₩${kiwoomData.cash?.toLocaleString()}`);
      
    } else {
      console.log('❌ 키움 API 연결 실패');
    }
    
  } catch (error) {
    console.error('테스트 실패:', error.message);
  }
}

testPortfolioAPI().then(() => {
  console.log('\n✅ 포트폴리오 API 테스트 완료');
  process.exit(0);
}).catch(error => {
  console.error('❌ 실패:', error);
  process.exit(1);
});