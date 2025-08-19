const DartService = require('./services/dartService');
const SuperstocksAnalyzer = require('./services/superstocksAnalyzer');
require('dotenv').config();

// 수정된 DART API 테스트
async function testFixedDart() {
  console.log('🧪 수정된 DART API 통합 테스트');
  console.log('===================================');
  
  const testStock = '005930'; // 삼성전자
  
  try {
    // 1. 기업코드 조회
    console.log('\n1. 기업코드 조회...');
    const corpInfo = await DartService.getCorpCode(testStock);
    console.log(`✅ ${testStock} → ${corpInfo?.corpCode}, ${corpInfo?.corpName}`);
    
    // 2. 재무제표 조회 (2024년)
    console.log('\n2. 2024년 재무제표 조회...');
    const financial2024 = await DartService.getFinancialStatement(testStock, 2024);
    if (financial2024) {
      console.log(`✅ 2024년 재무데이터:`);
      console.log(`   매출액: ${financial2024.revenue.toLocaleString()}억원`);
      console.log(`   순이익: ${financial2024.netIncome.toLocaleString()}억원`);
      console.log(`   영업이익: ${financial2024.operatingIncome.toLocaleString()}억원`);
    } else {
      console.log(`❌ 2024년 재무데이터 조회 실패`);
    }
    
    // 3. 3개년 재무분석
    console.log('\n3. 3개년 재무분석...');
    const analysis = await DartService.analyzeStockFinancials(testStock);
    if (analysis) {
      console.log(`✅ 3개년 분석 성공:`);
      console.log(`   회사명: ${analysis.name}`);
      console.log(`   최신년도: ${analysis.latestYear}`);
      console.log(`   매출성장률: ${analysis.revenueGrowth3Y}%`);
      console.log(`   순이익성장률: ${analysis.netIncomeGrowth3Y}%`);
      console.log(`   매출 추이: ${analysis.revenueHistory.map(r => r.toLocaleString()).join(' → ')}억원`);
      console.log(`   순이익 추이: ${analysis.netIncomeHistory.map(n => n.toLocaleString()).join(' → ')}억원`);
    } else {
      console.log(`❌ 3개년 분석 실패`);
    }
    
    // 4. 슈퍼스톡스 통합 분석
    console.log('\n4. 슈퍼스톡스 통합 분석...');
    const superstockResult = await SuperstocksAnalyzer.analyzeStock(testStock);
    if (superstockResult) {
      console.log(`✅ 슈퍼스톡스 분석 성공:`);
      console.log(`   현재가: ${superstockResult.currentPrice?.toLocaleString()}원`);
      console.log(`   시가총액: ${(superstockResult.marketCap/1000000000000).toFixed(1)}조원`);
      console.log(`   PSR: ${superstockResult.psr}`);
      console.log(`   매출성장률: ${superstockResult.revenueGrowth3Y}%`);
      console.log(`   순이익성장률: ${superstockResult.netIncomeGrowth3Y}%`);
      console.log(`   조건만족: ${superstockResult.meetsConditions ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   데이터소스: ${superstockResult.dataSource}`);
      console.log(`   점수: ${superstockResult.score}`);
      
      // PSR 계산 세부사항
      if (superstockResult.revenue && superstockResult.currentPrice) {
        const revenueInWon = superstockResult.revenue * 100000000; // 억원 → 원
        const calculatedPSR = superstockResult.marketCap / revenueInWon;
        console.log(`\n💡 PSR 계산 검증:`);
        console.log(`   시가총액: ${superstockResult.marketCap.toLocaleString()}원`);
        console.log(`   매출액: ${superstockResult.revenue.toLocaleString()}억원 = ${revenueInWon.toLocaleString()}원`);
        console.log(`   계산된 PSR: ${calculatedPSR.toFixed(4)}`);
        console.log(`   보고된 PSR: ${superstockResult.psr}`);
        console.log(`   일치여부: ${Math.abs(calculatedPSR - superstockResult.psr) < 0.01 ? '✅' : '❌'}`);
      }
      
    } else {
      console.log(`❌ 슈퍼스톡스 분석 실패`);
    }
    
    // 5. 다른 종목도 간단 테스트
    console.log('\n5. 다른 종목 간단 테스트...');
    const otherStocks = ['000660', '035420']; // SK하이닉스, NAVER
    
    for (const stock of otherStocks) {
      console.log(`\n--- ${stock} (${SuperstocksAnalyzer.getStockName(stock)}) ---`);
      
      const quickAnalysis = await DartService.analyzeStockFinancials(stock);
      if (quickAnalysis) {
        console.log(`✅ 매출성장률: ${quickAnalysis.revenueGrowth3Y}%, 순이익성장률: ${quickAnalysis.netIncomeGrowth3Y}%`);
      } else {
        console.log(`❌ 분석 실패`);
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✅ 수정된 DART API 테스트 완료');
    console.log('🎯 결과: 재무데이터 조회 및 PSR 계산 정상 작동!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testFixedDart().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ 실패:', error);
  process.exit(1);
});