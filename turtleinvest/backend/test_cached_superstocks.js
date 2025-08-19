/**
 * 캐시된 데이터를 활용한 고속 슈퍼스톡스 검색 테스트
 */

require('dotenv').config();
const mongoose = require('mongoose');
const FinancialData = require('./models/FinancialData');

class CachedSuperstocksTest {
  
  async connectToDatabase() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('🐢 MongoDB 연결 성공!');
    } catch (error) {
      console.error('❌ MongoDB 연결 실패:', error.message);
      throw error;
    }
  }

  // 캐시된 데이터로 고속 슈퍼스톡스 검색
  async fastSuperstocksSearch(conditions = {}) {
    try {
      const startTime = Date.now();
      
      const searchConditions = {
        minRevenueGrowth: conditions.minRevenueGrowth || 15,
        minNetIncomeGrowth: conditions.minNetIncomeGrowth || 15,
        maxPSR: conditions.maxPSR || 0.75,
        minPrice: conditions.minPrice || 1000,
        maxPrice: conditions.maxPrice || 500000
      };

      console.log(`⚡ 캐시 기반 고속 슈퍼스톡스 검색 시작...`);
      console.log(`🔍 조건: 매출성장률 ≥${searchConditions.minRevenueGrowth}%, 순이익성장률 ≥${searchConditions.minNetIncomeGrowth}%, PSR ≤${searchConditions.maxPSR}`);

      // 1. 캐시된 재무데이터 조회 (최신년도만)
      const cachedData = await FinancialData.find({
        dataYear: 2025, // 최신 수집년도
        revenue: { $gt: 0 }, // 매출이 있는 종목만
        sharesOutstanding: { $gt: 0 } // 상장주식수가 있는 종목만
      }).sort({ stockCode: 1 });

      console.log(`📊 캐시에서 ${cachedData.length}개 종목 로드 완료 (${((Date.now() - startTime)/1000).toFixed(2)}초)`);

      // 2. 가상 현재가 생성 (실제 환경에서는 키움/Yahoo API 사용)
      const mockPrices = {
        '005930': 71200,  // 삼성전자
        '035420': 152000, // NAVER
        '000660': 127000, // SK하이닉스
        '352820': 180000, // 하이브
        '326030': 95000,  // SK바이오팜
        '251270': 45000,  // 넷마블
        '036570': 210000, // 엔씨소프트
        '068270': 165000, // 셀트리온
        '207940': 850000  // 삼성바이오로직스
      };

      // 3. 조건 필터링 및 PSR 계산
      const results = [];
      
      cachedData.forEach(stock => {
        const currentPrice = mockPrices[stock.stockCode] || (Math.random() * 100000 + 10000); // 랜덤 가격
        
        // PSR 계산
        const marketCap = currentPrice * stock.sharesOutstanding;
        const revenueInWon = stock.revenue * 100000000; // 억원 → 원
        const psr = revenueInWon > 0 ? marketCap / revenueInWon : 999;

        // 가격 조건 확인
        if (currentPrice < searchConditions.minPrice || currentPrice > searchConditions.maxPrice) {
          return; // 가격 조건 미달
        }

        // 재무 조건 확인
        const meetsConditions = (
          stock.revenueGrowth3Y >= searchConditions.minRevenueGrowth &&
          stock.netIncomeGrowth3Y >= searchConditions.minNetIncomeGrowth &&
          psr <= searchConditions.maxPSR
        );

        // 점수 계산
        let score = 0;
        if (stock.revenueGrowth3Y >= 30) score += 50;
        else if (stock.revenueGrowth3Y >= 20) score += 40;
        else if (stock.revenueGrowth3Y >= 15) score += 30;

        if (stock.netIncomeGrowth3Y >= 30) score += 50;
        else if (stock.netIncomeGrowth3Y >= 20) score += 40;
        else if (stock.netIncomeGrowth3Y >= 15) score += 30;

        if (psr <= 0.5) score += 20;
        else if (psr <= 0.75) score += 10;

        const grade = score >= 90 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 50 ? 'FAIR' : 'POOR';

        results.push({
          symbol: stock.stockCode,
          name: stock.name,
          currentPrice: currentPrice,
          revenue: stock.revenue,
          netIncome: stock.netIncome,
          revenueGrowth3Y: stock.revenueGrowth3Y,
          netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
          psr: Math.round(psr * 1000) / 1000,
          marketCap: marketCap,
          score: grade,
          numericScore: score,
          meetsConditions: meetsConditions,
          dataSource: stock.dataSource,
          lastUpdated: stock.lastUpdated
        });
      });

      // 4. 결과 정렬
      const qualifiedStocks = results
        .filter(stock => stock.meetsConditions)
        .sort((a, b) => b.numericScore - a.numericScore);

      const allResults = results.sort((a, b) => b.numericScore - a.numericScore);

      const endTime = Date.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`⚡ 고속 검색 완료: ${qualifiedStocks.length}개 조건 만족 (총 ${results.length}개 분석, 소요시간: ${processingTime}초)`);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        processingTime: processingTime + '초',
        searchConditions,
        summary: {
          totalAnalyzed: results.length,
          qualifiedStocks: qualifiedStocks.length,
          excellentStocks: qualifiedStocks.filter(s => s.score === 'EXCELLENT').length,
          goodStocks: qualifiedStocks.filter(s => s.score === 'GOOD').length,
          averagePSR: results.length > 0 ? (results.reduce((sum, s) => sum + s.psr, 0) / results.length).toFixed(3) : 0,
          performance: {
            cacheHitRate: '100%',
            dataSource: 'MongoDB Cache',
            totalProcessingTime: processingTime + '초'
          }
        },
        qualifiedStocks: qualifiedStocks.slice(0, 20),
        excellentStocks: qualifiedStocks.filter(s => s.score === 'EXCELLENT'),
        goodStocks: qualifiedStocks.filter(s => s.score === 'GOOD'),
        allResults: allResults.slice(0, 50)
      };

    } catch (error) {
      console.error('❌ 캐시 기반 검색 실패:', error.message);
      throw error;
    }
  }

  // 캐시 통계 확인
  async getCacheStats() {
    try {
      const stats = await FinancialData.aggregate([
        {
          $group: {
            _id: {
              dataYear: '$dataYear',
              dataSource: '$dataSource'
            },
            count: { $sum: 1 },
            avgRevenue: { $avg: '$revenue' },
            avgRevenueGrowth: { $avg: '$revenueGrowth3Y' },
            avgNetIncomeGrowth: { $avg: '$netIncomeGrowth3Y' },
            stocks: { $push: '$stockCode' }
          }
        },
        {
          $sort: { '_id.dataYear': -1, '_id.dataSource': 1 }
        }
      ]);

      console.log('\n📊 캐시 통계:');
      stats.forEach(stat => {
        console.log(`${stat._id.dataYear}년 (${stat._id.dataSource}): ${stat.count}개`);
        console.log(`  평균 매출: ${stat.avgRevenue?.toFixed(0)}억원`);
        console.log(`  평균 매출성장률: ${stat.avgRevenueGrowth?.toFixed(1)}%`);
        console.log(`  평균 순이익성장률: ${stat.avgNetIncomeGrowth?.toFixed(1)}%`);
      });

      return stats;
    } catch (error) {
      console.error('캐시 통계 조회 실패:', error.message);
      return [];
    }
  }

  // 슈퍼스톡스 조건 만족 종목 찾기
  async findQualifiedStocks(minRevenueGrowth = 15, minNetIncomeGrowth = 15, maxPSR = 0.75) {
    try {
      console.log('\n🔍 슈퍼스톡스 조건 만족 종목 검색...');

      // MongoDB 쿼리로 1차 필터링
      const candidates = await FinancialData.find({
        dataYear: 2025,
        revenueGrowth3Y: { $gte: minRevenueGrowth },
        netIncomeGrowth3Y: { $gte: minNetIncomeGrowth },
        revenue: { $gt: 0 },
        sharesOutstanding: { $gt: 0 }
      }).sort({ revenueGrowth3Y: -1 });

      console.log(`📋 1차 필터링: ${candidates.length}개 후보 (매출/순이익 성장률 조건 만족)`);

      // 2차 PSR 계산 및 필터링
      const qualified = [];
      const mockPrices = {
        '005930': 71200, '035420': 152000, '000660': 127000,
        '352820': 180000, '326030': 95000
      };

      candidates.forEach(stock => {
        const currentPrice = mockPrices[stock.stockCode] || 50000; // 기본 5만원
        const marketCap = currentPrice * stock.sharesOutstanding;
        const revenueInWon = stock.revenue * 100000000;
        const psr = revenueInWon > 0 ? marketCap / revenueInWon : 999;

        if (psr <= maxPSR) {
          qualified.push({
            symbol: stock.stockCode,
            name: stock.name,
            currentPrice: currentPrice,
            revenue: stock.revenue,
            revenueGrowth3Y: stock.revenueGrowth3Y,
            netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
            psr: Math.round(psr * 1000) / 1000,
            dataSource: stock.dataSource
          });
        }
      });

      console.log(`✅ 최종 자격: ${qualified.length}개 종목 (PSR ≤ ${maxPSR} 조건 포함)`);

      qualified.forEach(stock => {
        console.log(`   ${stock.symbol} ${stock.name}: 매출성장률 ${stock.revenueGrowth3Y}%, 순이익성장률 ${stock.netIncomeGrowth3Y}%, PSR ${stock.psr}`);
      });

      return qualified;

    } catch (error) {
      console.error('자격 종목 검색 실패:', error.message);
      return [];
    }
  }
}

// 실행 함수
async function main() {
  const tester = new CachedSuperstocksTest();
  
  try {
    await tester.connectToDatabase();
    
    const mode = process.argv[2] || 'search';
    
    if (mode === 'stats') {
      // 캐시 통계만 확인
      await tester.getCacheStats();
    } else if (mode === 'qualified') {
      // 조건 만족 종목만 검색
      const qualified = await tester.findQualifiedStocks(15, 15, 0.75);
      console.log(`\n🎯 발견된 슈퍼스톡스: ${qualified.length}개`);
    } else if (mode === 'search') {
      // 전체 검색 테스트
      const result = await tester.fastSuperstocksSearch({
        minRevenueGrowth: 15,
        minNetIncomeGrowth: 15,
        maxPSR: 0.75
      });
      
      console.log('\n🎉 고속 검색 결과:');
      console.log(`⚡ 처리시간: ${result.processingTime}`);
      console.log(`📊 분석 종목: ${result.summary.totalAnalyzed}개`);
      console.log(`🎯 조건 만족: ${result.summary.qualifiedStocks}개`);
      console.log(`⭐ 우수 종목: ${result.summary.excellentStocks}개`);
      console.log(`💎 양호 종목: ${result.summary.goodStocks}개`);
      
      if (result.qualifiedStocks.length > 0) {
        console.log('\n🏆 발견된 종목들:');
        result.qualifiedStocks.forEach(stock => {
          console.log(`   ${stock.symbol} ${stock.name}: ${stock.currentPrice}원, 매출성장률 ${stock.revenueGrowth3Y}%, PSR ${stock.psr} (${stock.score})`);
        });
      }
    } else {
      console.log('\n사용법:');
      console.log('  node test_cached_superstocks.js search     # 전체 검색 테스트');
      console.log('  node test_cached_superstocks.js qualified  # 조건 만족 종목만');
      console.log('  node test_cached_superstocks.js stats      # 캐시 통계');
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('👋 MongoDB 연결 종료');
  }
}

if (require.main === module) {
  main();
}

module.exports = CachedSuperstocksTest;