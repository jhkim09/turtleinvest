const DartService = require('./services/dartService');
const YahooFinanceService = require('./services/yahooFinanceService');
require('dotenv').config();

// DART API 기본 테스트
async function testDartAPI() {
  console.log('\n=== DART API 테스트 ===');
  
  // API 키 확인
  console.log(`📋 DART API Key: ${process.env.DART_API_KEY ? process.env.DART_API_KEY.substring(0, 8) + '...' : 'NOT SET'}`);
  
  // 삼성전자로 테스트
  const testStock = '005930'; // 삼성전자
  console.log(`\n🧪 삼성전자(${testStock}) 테스트 시작...`);
  
  try {
    // 1. 기업코드 조회 테스트
    console.log('\n1. 기업코드 조회 테스트...');
    const corpInfo = await DartService.getCorpCode(testStock);
    console.log(`결과: ${corpInfo ? JSON.stringify(corpInfo) : '실패'}`);
    
    if (corpInfo) {
      // 2. 재무제표 조회 테스트
      console.log('\n2. 재무제표 조회 테스트...');
      const financial = await DartService.getFinancialStatement(testStock, 2024);
      console.log(`결과: ${financial ? JSON.stringify(financial) : '실패'}`);
      
      // 3. 3개년 재무분석 테스트
      console.log('\n3. 3개년 재무분석 테스트...');
      const analysis = await DartService.analyzeStockFinancials(testStock);
      console.log(`결과: ${analysis ? JSON.stringify(analysis) : '실패'}`);
    }
    
  } catch (error) {
    console.error(`❌ DART API 테스트 실패: ${error.message}`);
  }
}

// Yahoo Finance API 기본 테스트
async function testYahooAPI() {
  console.log('\n=== Yahoo Finance API 테스트 ===');
  
  const testStock = '005930'; // 삼성전자
  console.log(`\n🧪 삼성전자(${testStock}) 테스트 시작...`);
  
  try {
    // 1. 현재가 조회 테스트
    console.log('\n1. 현재가 조회 테스트...');
    const price = await YahooFinanceService.getCurrentPrice(testStock);
    console.log(`결과: ${price ? `${price}원` : '실패'}`);
    
    // 2. 주식 정보 조회 테스트  
    console.log('\n2. 주식 정보 조회 테스트...');
    const stockInfo = await YahooFinanceService.getStockInfo(testStock);
    console.log(`결과: ${stockInfo ? JSON.stringify(stockInfo) : '실패'}`);
    
    // 3. 연결 테스트
    console.log('\n3. 연결 테스트...');
    const connectionTest = await YahooFinanceService.testConnection(testStock);
    console.log(`결과: ${JSON.stringify(connectionTest)}`);
    
  } catch (error) {
    console.error(`❌ Yahoo Finance API 테스트 실패: ${error.message}`);
  }
}

// 50개 축소 종목 API 호환성 테스트
async function testReducedStockList() {
  console.log('\n=== 50개 축소 종목 API 호환성 테스트 ===');
  
  const SuperstocksAnalyzer = require('./services/superstocksAnalyzer');
  const stockList = SuperstocksAnalyzer.getDefaultStockList();
  
  console.log(`📊 총 ${stockList.length}개 종목 테스트 시작...`);
  
  const results = {
    total: stockList.length,
    dartSuccess: 0,
    dartFail: 0,
    yahooSuccess: 0,
    yahooFail: 0,
    errors: []
  };
  
  // 처음 5개 종목만 테스트 (전체는 시간이 오래 걸림)
  const testStocks = stockList.slice(0, 5);
  console.log(`🧪 샘플 테스트: ${testStocks.join(', ')}`);
  
  for (const stock of testStocks) {
    console.log(`\n--- ${stock} (${SuperstocksAnalyzer.getStockName(stock)}) ---`);
    
    // DART API 테스트
    try {
      const corpInfo = await DartService.getCorpCode(stock);
      if (corpInfo) {
        results.dartSuccess++;
        console.log(`✅ DART: ${corpInfo.corpName}`);
      } else {
        results.dartFail++;
        console.log(`❌ DART: 기업코드 없음`);
      }
    } catch (error) {
      results.dartFail++;
      results.errors.push(`${stock} DART: ${error.message}`);
      console.log(`❌ DART: ${error.message}`);
    }
    
    // Yahoo Finance API 테스트
    try {
      const price = await YahooFinanceService.getCurrentPrice(stock);
      if (price) {
        results.yahooSuccess++;
        console.log(`✅ Yahoo: ${price}원`);
      } else {
        results.yahooFail++;
        console.log(`❌ Yahoo: 현재가 없음`);
      }
    } catch (error) {
      results.yahooFail++;
      results.errors.push(`${stock} Yahoo: ${error.message}`);
      console.log(`❌ Yahoo: ${error.message}`);
    }
    
    // Rate limit 방지
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n=== 테스트 결과 요약 ===');
  console.log(`📊 DART API: ${results.dartSuccess}/${testStocks.length} 성공`);
  console.log(`📊 Yahoo API: ${results.yahooSuccess}/${testStocks.length} 성공`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ 발생한 오류들:');
    results.errors.forEach(error => console.log(`   ${error}`));
  }
  
  return results;
}

// 개별 종목별 상세 오류 분석
async function analyzeSpecificErrors() {
  console.log('\n=== 개별 종목별 상세 오류 분석 ===');
  
  const problemStocks = ['032350', '060310', '042700']; // 알려진 문제 종목들
  
  for (const stock of problemStocks) {
    console.log(`\n🔍 ${stock} 상세 분석...`);
    
    try {
      // DART 상세 분석
      console.log(`\n--- DART 분석 ---`);
      const corpInfo = await DartService.getCorpCode(stock);
      if (corpInfo) {
        console.log(`✅ 기업코드: ${corpInfo.corpCode}, 회사명: ${corpInfo.corpName}`);
        
        // 재무제표 조회 시도
        const financial = await DartService.getFinancialStatement(stock, 2024);
        if (financial) {
          console.log(`✅ 재무데이터: 매출 ${financial.revenue}억원, 순이익 ${financial.netIncome}억원`);
        } else {
          console.log(`❌ 재무제표 조회 실패`);
        }
      } else {
        console.log(`❌ 기업코드 조회 실패`);
      }
      
      // Yahoo Finance 상세 분석
      console.log(`\n--- Yahoo Finance 분석 ---`);
      const yahooSymbol = `${stock}.KS`;
      console.log(`Yahoo 심볼: ${yahooSymbol}`);
      
      const price = await YahooFinanceService.getCurrentPrice(stock);
      if (price) {
        console.log(`✅ 현재가: ${price}원`);
        
        const stockInfo = await YahooFinanceService.getStockInfo(stock);
        if (stockInfo) {
          console.log(`✅ 주식정보: 상장주식수 ${stockInfo.sharesOutstanding?.toLocaleString() || 'N/A'}주`);
          console.log(`             시총 ${(stockInfo.marketCap/1000000000)?.toFixed(1) || 'N/A'}억원`);
          console.log(`             PSR ${stockInfo.priceToSalesTrailing12Months?.toFixed(2) || 'N/A'}`);
        } else {
          console.log(`❌ 주식정보 조회 실패`);
        }
      } else {
        console.log(`❌ 현재가 조회 실패`);
      }
      
    } catch (error) {
      console.error(`❌ ${stock} 분석 중 오류: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
  }
}

// 메인 실행
async function runAllTests() {
  console.log('🧪 TurtleInvest API 통합 테스트 시작');
  console.log('==========================================');
  
  try {
    await testDartAPI();
    await testYahooAPI();
    await testReducedStockList();
    await analyzeSpecificErrors();
    
    console.log('\n✅ 모든 테스트 완료');
    
  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error);
  } finally {
    process.exit(0);
  }
}

runAllTests();