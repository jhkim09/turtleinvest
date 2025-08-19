const axios = require('axios');

// Yahoo Finance 대안 방법들 테스트
async function testYahooAlternatives() {
  const symbol = '005930'; // 삼성전자
  const yahooSymbol = `${symbol}.KS`;
  
  console.log(`🧪 ${yahooSymbol} Yahoo Finance 대안 방법 테스트`);
  
  // 방법 1: 기본 차트 API (이미 작동함)
  try {
    console.log('\n1. 차트 API 테스트...');
    const response1 = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`, {
      params: {
        range: '1d',
        interval: '1m'
      },
      timeout: 5000
    });
    
    const result = response1.data.chart?.result?.[0];
    if (result) {
      const price = result.meta?.regularMarketPrice;
      console.log(`✅ 현재가: ${price}원`);
      console.log(`✅ 심볼: ${result.meta?.symbol}`);
      console.log(`✅ 통화: ${result.meta?.currency}`);
      console.log(`✅ 거래소: ${result.meta?.exchangeName}`);
    }
  } catch (error) {
    console.error('❌ 차트 API 실패:', error.message);
  }
  
  // 방법 2: 다른 모듈 사용하지 않고 차트에서 더 많은 정보 추출
  try {
    console.log('\n2. 확장된 차트 정보 추출...');
    const response2 = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`, {
      params: {
        range: '1y',
        interval: '1d',
        includePrePost: false,
        events: 'div,splits'
      },
      timeout: 10000
    });
    
    const result = response2.data.chart?.result?.[0];
    if (result) {
      const meta = result.meta;
      console.log(`✅ 52주 신고가: ${meta.fiftyTwoWeekHigh}`);
      console.log(`✅ 52주 신저가: ${meta.fiftyTwoWeekLow}`);
      console.log(`✅ 시가총액: ${meta.marketCap?.toLocaleString()}`);
      console.log(`✅ 유통주식수: ${meta.sharesOutstanding?.toLocaleString()}`);
      
      // 거래량 평균 계산
      const volumes = result.indicators?.quote?.[0]?.volume || [];
      const avgVolume = volumes.reduce((a, b) => a + (b || 0), 0) / volumes.length;
      console.log(`✅ 평균거래량: ${Math.round(avgVolume).toLocaleString()}`);
    }
  } catch (error) {
    console.error('❌ 확장 차트 API 실패:', error.message);
  }
  
  // 방법 3: 다른 엔드포인트 시도 (User-Agent 추가)
  try {
    console.log('\n3. User-Agent 포함 요청...');
    const response3 = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      params: {
        range: '1d',
        interval: '1m'
      },
      timeout: 5000
    });
    
    console.log(`✅ User-Agent 추가 요청 성공`);
  } catch (error) {
    console.error('❌ User-Agent 요청 실패:', error.message);
  }
  
  // 방법 4: 한국투자증권 Open API 시뮬레이션 (실제 구현은 별도 필요)
  console.log('\n4. 한국투자증권 API 대안 (참고용)...');
  console.log('- 한국투자증권 Open API를 통해 실시간 시세 조회 가능');
  console.log('- 상장주식수, 재무정보 등은 별도 API 필요');
  console.log('- DART API와 조합하여 완전한 데이터 구성 가능');
  
  // 방법 5: 웹 스크래핑 대안 (참고용)
  console.log('\n5. 웹 스크래핑 대안 (참고용)...');
  console.log('- 네이버 금융, 다음 금융 등에서 스크래핑');
  console.log('- 단, 이용약관 및 법적 제약 확인 필요');
  console.log('- 안정성과 지속성 측면에서 제한적');
}

// 상장주식수 대안 계산법
function calculateAlternativeShares(symbol, currentPrice) {
  console.log('\n=== 상장주식수 대안 계산법 ===');
  
  // 알려진 대형주 시가총액 기반 추정
  const knownMarketCaps = {
    '005930': 841000000000000, // 삼성전자 약 841조원
    '000660': 195000000000000, // SK하이닉스 약 195조원
    '035420': 37000000000000,  // NAVER 약 37조원
    '005380': 63000000000000,  // 현대차 약 63조원
    '012330': 34000000000000   // 현대모비스 약 34조원
  };
  
  if (knownMarketCaps[symbol]) {
    const estimatedShares = Math.round(knownMarketCaps[symbol] / currentPrice);
    console.log(`💡 ${symbol} 추정 상장주식수: ${estimatedShares.toLocaleString()}주`);
    console.log(`   (시총 ${(knownMarketCaps[symbol]/1000000000000).toFixed(0)}조원 ÷ 현재가 ${currentPrice.toLocaleString()}원)`);
    return estimatedShares;
  }
  
  return null;
}

testYahooAlternatives().then(() => {
  calculateAlternativeShares('005930', 70300);
  calculateAlternativeShares('000660', 267750);
  
  console.log('\n✅ Yahoo Finance 대안 테스트 완료');
  process.exit(0);
}).catch(error => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});