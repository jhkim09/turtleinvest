/**
 * 현실적인 슈퍼스톡스 검색 테스트
 * PSR 조건을 현실적으로 완화하여 테스트
 */

require('dotenv').config();
const mongoose = require('mongoose');
const FinancialData = require('./models/FinancialData');

async function realisticSuperstocksTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🐢 MongoDB 연결 성공!');

    // 다양한 조건으로 테스트
    const testConditions = [
      {
        name: '엄격한 조건 (원래 슈퍼스톡스)',
        minRevenueGrowth: 15,
        minNetIncomeGrowth: 15,
        maxPSR: 0.75
      },
      {
        name: '현실적 조건 (성장주 고려)',
        minRevenueGrowth: 15,
        minNetIncomeGrowth: 15,
        maxPSR: 2.5
      },
      {
        name: '완화된 조건 (더 많은 후보)',
        minRevenueGrowth: 10,
        minNetIncomeGrowth: 10,
        maxPSR: 3.0
      }
    ];

    for (const condition of testConditions) {
      console.log(`\n🔍 ${condition.name} 테스트...`);
      console.log(`   조건: 매출성장률 ≥${condition.minRevenueGrowth}%, 순이익성장률 ≥${condition.minNetIncomeGrowth}%, PSR ≤${condition.maxPSR}`);

      // 캐시된 데이터 조회
      const cachedData = await FinancialData.find({
        dataYear: 2025,
        revenue: { $gt: 0 },
        sharesOutstanding: { $gt: 0 },
        revenueGrowth3Y: { $gte: condition.minRevenueGrowth },
        netIncomeGrowth3Y: { $gte: condition.minNetIncomeGrowth }
      });

      console.log(`📊 1차 필터링 결과: ${cachedData.length}개 후보`);

      // PSR 계산 및 최종 필터링
      const mockPrices = {
        '005930': 71200, '035420': 152000, '000660': 127000,
        '352820': 180000, '326030': 95000
      };

      const qualified = [];
      
      cachedData.forEach(stock => {
        const currentPrice = mockPrices[stock.stockCode] || 50000;
        const marketCap = currentPrice * stock.sharesOutstanding;
        const revenueInWon = stock.revenue * 100000000;
        const psr = revenueInWon > 0 ? marketCap / revenueInWon : 999;

        if (psr <= condition.maxPSR) {
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

      console.log(`✅ 최종 자격: ${qualified.length}개 종목`);
      
      if (qualified.length > 0) {
        qualified.forEach(stock => {
          console.log(`   🎯 ${stock.symbol} ${stock.name}: 매출성장률 ${stock.revenueGrowth3Y}%, 순이익성장률 ${stock.netIncomeGrowth3Y}%, PSR ${stock.psr}`);
        });
      } else {
        console.log('   조건을 만족하는 종목이 없습니다.');
      }
    }

    // 전체 캐시 데이터 샘플 확인
    console.log('\n📊 캐시된 데이터 샘플:');
    const samples = await FinancialData.find({ dataYear: 2025 }).limit(10).sort({ revenueGrowth3Y: -1 });
    
    samples.forEach(stock => {
      console.log(`   ${stock.stockCode} ${stock.name}: 매출 ${stock.revenue}억, 매출성장률 ${stock.revenueGrowth3Y}%, 순이익성장률 ${stock.netIncomeGrowth3Y}% (${stock.dataSource})`);
    });

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('👋 MongoDB 연결 종료');
  }
}

realisticSuperstocksTest();