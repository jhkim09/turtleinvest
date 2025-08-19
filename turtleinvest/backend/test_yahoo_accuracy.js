require('dotenv').config();
const YahooFinanceService = require('./services/yahooFinanceService');

// Yahoo Finance 정확도 테스트
async function testYahooAccuracy() {
  console.log('🔍 Yahoo Finance 현재가 정확도 테스트');
  console.log('===================================');
  
  // 실제 시장가와 비교할 종목들 (사용자 제공 정보)
  const testStocks = [
    { symbol: '214450', name: '파마리서치', realPrice: 668000, expectedRange: [600000, 700000] },
    { symbol: '005930', name: '삼성전자', realPrice: 70000, expectedRange: [65000, 75000] },
    { symbol: '000660', name: 'SK하이닉스', realPrice: 263000, expectedRange: [250000, 280000] },
    { symbol: '035420', name: 'NAVER', realPrice: 225500, expectedRange: [220000, 240000] }
  ];
  
  console.log('📊 종목별 정확도 검증:');
  
  for (const stock of testStocks) {
    try {
      const yahooPrice = await YahooFinanceService.getCurrentPrice(stock.symbol);
      const accuracy = yahooPrice ? Math.abs(stock.realPrice - yahooPrice) / stock.realPrice * 100 : 100;
      const isAccurate = yahooPrice >= stock.expectedRange[0] && yahooPrice <= stock.expectedRange[1];
      
      console.log(`\\n--- ${stock.name} (${stock.symbol}) ---`);
      console.log(`실제 시장가: ${stock.realPrice.toLocaleString()}원`);
      console.log(`Yahoo 현재가: ${yahooPrice?.toLocaleString() || 'N/A'}원`);
      console.log(`정확도: ${(100 - accuracy).toFixed(1)}% ${isAccurate ? '✅' : '❌'}`);
      console.log(`차이: ${yahooPrice ? Math.abs(stock.realPrice - yahooPrice).toLocaleString() : 'N/A'}원`);
      
      if (!isAccurate) {
        console.log(`🚨 부정확한 데이터: ${accuracy.toFixed(1)}% 오차`);
      }
      
    } catch (error) {
      console.log(`❌ ${stock.symbol} 조회 실패: ${error.message}`);
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\\n💡 해결방안:');
  console.log('1. 한국투자증권 Open API 사용 (더 정확한 한국 주식 데이터)');
  console.log('2. 네이버 금융 API 사용');
  console.log('3. 키움 API 현재가 조회 문제 해결');
  console.log('4. 코스닥 소형주는 별도 데이터 소스 필요');
  
  console.log('\\n🎯 권장사항:');
  console.log('- 대형주 (삼성전자, SK하이닉스): Yahoo Finance 사용 가능');
  console.log('- 소형주/코스닥: 다른 데이터 소스 필요');
  console.log('- 파마리서치 같은 소형주는 실시간 데이터 확보 어려움');
}

testYahooAccuracy().then(() => {
  console.log('\\n✅ 정확도 테스트 완료');
  process.exit(0);
}).catch(error => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});