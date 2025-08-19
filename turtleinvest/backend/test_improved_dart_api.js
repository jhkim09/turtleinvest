/**
 * 개선된 DART Multi-company API 성능 테스트
 * 
 * 테스트 목표:
 * 1. Bulk API vs 기존 API 성능 비교
 * 2. 데이터 정확성 검증
 * 3. 에러 핸들링 확인
 */

const DartService = require('./services/dartService');
const FinancialDataCacheService = require('./services/financialDataCacheService');

class PerformanceTest {
  constructor() {
    this.testStocks = [
      '005930', // 삼성전자
      '000660', // SK하이닉스
      '035420', // NAVER
      '005380', // 현대차
      '012330', // 현대모비스
      '000270', // 기아
      '105560', // KB금융
      '055550', // 신한지주
      '035720', // 카카오
      '051910', // LG화학
      '251270', // 넷마블
      '036570', // 엔씨소프트
      '352820', // 하이브
      '326030', // SK바이오팜
      '145020', // 휴젤
      '042700', // 한미반도체
      '377300', // 카카오페이
      '259960', // 크래프톤
      '195940', // HK이노엔
      '214150'  // 클래시스
    ];
  }

  // 기존 방식 성능 테스트
  async testLegacyAPI() {
    console.log('\n🔍 기존 DART API 성능 테스트 시작...');
    console.log(`테스트 대상: ${this.testStocks.length}개 종목`);
    
    const startTime = Date.now();
    const results = [];
    const errors = [];

    for (const stockCode of this.testStocks.slice(0, 10)) { // 10개만 테스트
      try {
        console.log(`📊 ${stockCode} 기존 방식 분석 중...`);
        const data = await DartService.analyzeStockFinancials(stockCode);
        
        if (data) {
          results.push({
            stockCode,
            name: data.name,
            revenue: data.revenue,
            netIncome: data.netIncome,
            revenueGrowth3Y: data.revenueGrowth3Y,
            netIncomeGrowth3Y: data.netIncomeGrowth3Y,
            method: 'legacy'
          });
        } else {
          errors.push({ stockCode, error: 'No data returned' });
        }
        
        // Rate limit 준수
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`❌ ${stockCode} 기존 방식 실패:`, error.message);
        errors.push({ stockCode, error: error.message });
      }
    }

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1);

    return {
      method: 'Legacy API',
      processingTime: processingTime + '초',
      successCount: results.length,
      errorCount: errors.length,
      successRate: ((results.length / (results.length + errors.length)) * 100).toFixed(1) + '%',
      results,
      errors
    };
  }

  // 개선된 Bulk API 성능 테스트
  async testBulkAPI() {
    console.log('\n🚀 개선된 Bulk DART API 성능 테스트 시작...');
    console.log(`테스트 대상: ${this.testStocks.length}개 종목`);
    
    const startTime = Date.now();
    
    try {
      const bulkResult = await DartService.getBulkFinancialData(this.testStocks, 10);
      
      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(1);
      
      return {
        method: 'Bulk API',
        processingTime: processingTime + '초',
        successCount: bulkResult.summary.success,
        errorCount: bulkResult.summary.failed,
        successRate: bulkResult.summary.successRate,
        bulkSummary: bulkResult.summary,
        sampleResults: Array.from(bulkResult.successes.entries()).slice(0, 5).map(([stockCode, data]) => ({
          stockCode,
          name: data.name,
          revenue: data.revenue,
          netIncome: data.netIncome,
          revenueGrowth3Y: data.revenueGrowth3Y,
          netIncomeGrowth3Y: data.netIncomeGrowth3Y,
          method: 'bulk'
        })),
        errors: bulkResult.failures.slice(0, 5)
      };
      
    } catch (error) {
      console.error('❌ Bulk API 테스트 실패:', error.message);
      return {
        method: 'Bulk API',
        processingTime: '실패',
        error: error.message
      };
    }
  }

  // 슈퍼스톡스 고속 검색 테스트
  async testSuperstocksSearch() {
    console.log('\n⚡ 슈퍼스톡스 고속 검색 테스트 시작...');
    
    const startTime = Date.now();
    
    try {
      const financialDataMap = await FinancialDataCacheService.getSuperstocksFinancialData(this.testStocks);
      
      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(1);
      
      // 캐시 적중률 분석
      const cacheHits = Array.from(financialDataMap.values()).filter(data => data.dataSource === 'CACHED').length;
      const freshData = Array.from(financialDataMap.values()).filter(data => data.dataSource === 'FRESH_BULK').length;
      
      return {
        method: 'Superstocks Fast Search',
        processingTime: processingTime + '초',
        totalRetrieved: financialDataMap.size,
        cacheHits: cacheHits,
        freshData: freshData,
        cacheHitRate: ((cacheHits / financialDataMap.size) * 100).toFixed(1) + '%',
        sampleData: Array.from(financialDataMap.entries()).slice(0, 5).map(([stockCode, data]) => ({
          stockCode,
          name: data.name,
          revenue: data.revenue,
          dataSource: data.dataSource,
          revenueGrowth3Y: data.revenueGrowth3Y
        }))
      };
      
    } catch (error) {
      console.error('❌ 슈퍼스톡스 고속 검색 실패:', error.message);
      return {
        method: 'Superstocks Fast Search',
        processingTime: '실패',
        error: error.message
      };
    }
  }

  // 데이터 정확성 검증
  async validateDataAccuracy() {
    console.log('\n🔍 데이터 정확성 검증...');
    
    const testStock = '005930'; // 삼성전자
    
    try {
      // 기존 방식
      const legacyData = await DartService.analyzeStockFinancials(testStock);
      
      // 새로운 Bulk 방식
      const bulkResult = await DartService.getBulkFinancialData([testStock], 1);
      const bulkData = bulkResult.successes.get(testStock);
      
      if (!legacyData || !bulkData) {
        return {
          testStock,
          result: '실패',
          error: 'One or both methods returned no data'
        };
      }
      
      // 데이터 비교
      const revenueMatch = Math.abs(legacyData.revenue - bulkData.revenue) < 100; // 100억원 오차 허용
      const growthMatch = Math.abs(legacyData.revenueGrowth3Y - bulkData.revenueGrowth3Y) < 1; // 1% 오차 허용
      
      return {
        testStock,
        result: revenueMatch && growthMatch ? '성공' : '부분 일치',
        comparison: {
          legacy: {
            revenue: legacyData.revenue,
            revenueGrowth3Y: legacyData.revenueGrowth3Y,
            name: legacyData.name
          },
          bulk: {
            revenue: bulkData.revenue,
            revenueGrowth3Y: bulkData.revenueGrowth3Y,
            name: bulkData.name
          }
        },
        matches: {
          revenue: revenueMatch,
          growth: growthMatch
        }
      };
      
    } catch (error) {
      return {
        testStock,
        result: '실패',
        error: error.message
      };
    }
  }

  // 전체 테스트 실행
  async runAllTests() {
    console.log('🚀 TurtleInvest API 개선 성능 테스트 시작');
    console.log('=' .repeat(50));
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {}
    };
    
    try {
      // 1. 기존 API 테스트 (작은 샘플)
      results.tests.legacy = await this.testLegacyAPI();
      
      // 2. 새로운 Bulk API 테스트
      results.tests.bulk = await this.testBulkAPI();
      
      // 3. 슈퍼스톡스 고속 검색 테스트
      results.tests.superstocks = await this.testSuperstocksSearch();
      
      // 4. 데이터 정확성 검증
      results.tests.validation = await this.validateDataAccuracy();
      
      // 5. 성능 개선 요약
      const legacyTime = parseFloat(results.tests.legacy?.processingTime) || 0;
      const bulkTime = parseFloat(results.tests.bulk?.processingTime) || 0;
      const superstocksTime = parseFloat(results.tests.superstocks?.processingTime) || 0;
      
      if (legacyTime > 0 && bulkTime > 0) {
        const improvement = ((legacyTime - bulkTime) / legacyTime * 100).toFixed(1);
        results.performanceImprovement = {
          legacyTime: legacyTime + '초',
          bulkTime: bulkTime + '초',
          superstocksTime: superstocksTime + '초',
          improvement: improvement + '%',
          verdict: improvement > 0 ? '성능 개선됨' : '성능 차이 미미'
        };
      }
      
    } catch (error) {
      console.error('전체 테스트 실패:', error);
      results.error = error.message;
    }
    
    // 결과 출력
    this.printResults(results);
    
    return results;
  }

  // 결과 출력
  printResults(results) {
    console.log('\n📊 테스트 결과 요약');
    console.log('=' .repeat(50));
    
    if (results.tests.legacy) {
      console.log(`\n🔧 기존 API:`);
      console.log(`   처리시간: ${results.tests.legacy.processingTime}`);
      console.log(`   성공률: ${results.tests.legacy.successRate}`);
      console.log(`   성공/실패: ${results.tests.legacy.successCount}/${results.tests.legacy.errorCount}`);
    }
    
    if (results.tests.bulk) {
      console.log(`\n🚀 개선된 Bulk API:`);
      console.log(`   처리시간: ${results.tests.bulk.processingTime}`);
      console.log(`   성공률: ${results.tests.bulk.successRate}`);
      console.log(`   성공/실패: ${results.tests.bulk.successCount}/${results.tests.bulk.errorCount}`);
    }
    
    if (results.tests.superstocks) {
      console.log(`\n⚡ 슈퍼스톡스 고속 검색:`);
      console.log(`   처리시간: ${results.tests.superstocks.processingTime}`);
      console.log(`   데이터 수집: ${results.tests.superstocks.totalRetrieved}개`);
      console.log(`   캐시 적중률: ${results.tests.superstocks.cacheHitRate}`);
    }
    
    if (results.tests.validation) {
      console.log(`\n🔍 데이터 정확성:`);
      console.log(`   검증 결과: ${results.tests.validation.result}`);
      if (results.tests.validation.matches) {
        console.log(`   매출 일치: ${results.tests.validation.matches.revenue ? '✅' : '❌'}`);
        console.log(`   성장률 일치: ${results.tests.validation.matches.growth ? '✅' : '❌'}`);
      }
    }
    
    if (results.performanceImprovement) {
      console.log(`\n🎯 성능 개선 요약:`);
      console.log(`   기존: ${results.performanceImprovement.legacyTime}`);
      console.log(`   개선: ${results.performanceImprovement.bulkTime}`);
      console.log(`   개선율: ${results.performanceImprovement.improvement}`);
      console.log(`   평가: ${results.performanceImprovement.verdict}`);
    }
    
    console.log('\n' + '=' .repeat(50));
  }
}

// 테스트 실행
if (require.main === module) {
  const test = new PerformanceTest();
  test.runAllTests()
    .then(results => {
      console.log('\n✅ 모든 테스트 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 테스트 실행 중 오류:', error);
      process.exit(1);
    });
}

module.exports = PerformanceTest;