require('dotenv').config();
const SuperstocksAnalyzer = require('./services/superstocksAnalyzer');

// PSR 조건 완화 테스트
async function testPSRConditions() {
  console.log('🧪 PSR 조건 완화 테스트');
  console.log('======================');
  
  const testStocks = ['005930', '000660', '035420']; // 삼성전자, SK하이닉스, NAVER
  
  console.log('📊 현재 PSR 조건: ≤ 0.75');
  
  // 각 종목별 상세 분석
  for (const stock of testStocks) {
    console.log(`\n--- ${SuperstocksAnalyzer.getStockName(stock)} ---`);
    
    const result = await SuperstocksAnalyzer.analyzeStock(stock);
    if (result) {
      console.log(`매출성장률: ${result.revenueGrowth3Y}%`);
      console.log(`순이익성장률: ${result.netIncomeGrowth3Y}%`);
      console.log(`PSR: ${result.psr}`);
      
      // 다양한 PSR 기준으로 테스트
      const psrLimits = [0.75, 1.5, 2.5, 3.5];
      psrLimits.forEach(limit => {
        const qualifies = (
          result.revenueGrowth3Y >= 15 &&
          result.netIncomeGrowth3Y >= 15 &&
          result.psr <= limit
        );
        console.log(`   PSR ≤ ${limit}: ${qualifies ? '✅' : '❌'}`);
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n💡 권장사항:');
  console.log('1. 원래 슈퍼스톡스 조건 (PSR ≤ 0.75): 매우 엄격, 현재 시장에서 찾기 어려움');
  console.log('2. 완화된 조건 (PSR ≤ 1.5): 성장주 고려한 현실적 기준');
  console.log('3. 유연한 조건 (PSR ≤ 2.5): 기술주 포함한 넓은 선택');
  console.log('4. 슈퍼스톡스 원칙 유지하되 PSR 조건만 현재 시장에 맞게 조정 권장');
}

testPSRConditions().then(() => {
  console.log('\n✅ PSR 조건 분석 완료');
  process.exit(0);
}).catch(error => {
  console.error('❌ 실패:', error);
  process.exit(1);
});