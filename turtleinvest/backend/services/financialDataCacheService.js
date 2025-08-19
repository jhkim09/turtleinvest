const FinancialData = require('../models/FinancialData');
const DartService = require('./dartService');

class FinancialDataCacheService {
  constructor() {
    this.currentDataYear = new Date().getFullYear();
    
    // 4월 1일 이후면 전년도 데이터를 수집
    const now = new Date();
    if (now.getMonth() >= 3) { // 4월(3)부터
      this.targetYear = this.currentDataYear - 1; // 2024년이면 2023년 데이터
    } else {
      this.targetYear = this.currentDataYear - 2; // 2024년 3월이면 2022년 데이터
    }
    
    console.log(`📅 재무데이터 캐시 서비스 초기화: ${this.targetYear}년 데이터 대상 (수집년도: ${this.currentDataYear})`);
  }
  
  // 캐시된 재무데이터 조회 (메인 API)
  async getCachedFinancialData(stockCode) {
    try {
      // 1. 데이터베이스에서 최신 재무데이터 조회
      const cachedData = await FinancialData.getLatestFinancialData(stockCode);
      
      if (cachedData && cachedData.hasFullData) {
        const latest = cachedData.latest;
        
        // 데이터 수집년도가 현재년도와 같으면 사용 (최신 데이터)
        if (latest.dataYear === this.currentDataYear) {
          console.log(`✅ ${stockCode} 캐시된 재무데이터 사용 (${latest.dataYear}년 수집)`);
          
          return {
            stockCode: stockCode,
            name: latest.name,
            revenue: latest.revenue,
            netIncome: latest.netIncome,
            revenueGrowth3Y: latest.revenueGrowth3Y,
            netIncomeGrowth3Y: latest.netIncomeGrowth3Y,
            sharesOutstanding: latest.sharesOutstanding,
            dataSource: 'CACHED',
            lastUpdated: latest.lastUpdated,
            allYearsData: cachedData.allYears
          };
        }
      }
      
      // 2. 캐시 없거나 오래된 데이터면 새로 수집
      console.log(`🔄 ${stockCode} 재무데이터 새로 수집 필요`);
      return await this.collectAndCacheFinancialData(stockCode);
      
    } catch (error) {
      console.error(`캐시된 재무데이터 조회 실패 (${stockCode}):`, error);
      return null;
    }
  }
  
  // 새로 수집하고 캐시에 저장
  async collectAndCacheFinancialData(stockCode) {
    try {
      console.log(`📊 ${stockCode} DART API로 재무데이터 수집 시작...`);
      
      // DART API로 재무데이터 수집
      const dartResult = await DartService.analyzeStockFinancials(stockCode);
      if (!dartResult || !dartResult.stockCode) {
        console.log(`❌ ${stockCode} DART 재무데이터 수집 실패`);
        return null;
      }
      
      // 상장주식수도 함께 수집
      let sharesOutstanding = null;
      try {
        sharesOutstanding = await DartService.getSharesOutstanding(stockCode, this.targetYear);
      } catch (error) {
        console.log(`⚠️ ${stockCode} 상장주식수 조회 실패: ${error.message}`);
      }
      
      // 3개년 데이터 구성
      const yearlyData = [];
      for (let i = 0; i < 3; i++) {
        const year = this.targetYear - i;
        yearlyData.push({
          year: year,
          revenue: dartResult.revenue || 0,
          netIncome: dartResult.netIncome || 0,
          operatingIncome: dartResult.operatingIncome || 0,
          sharesOutstanding: sharesOutstanding || 0,
          revenueGrowth3Y: dartResult.revenueGrowth3Y || 0,
          netIncomeGrowth3Y: dartResult.netIncomeGrowth3Y || 0,
          dataSource: 'DART',
          isValidated: true
        });
      }
      
      // 데이터베이스에 저장
      await FinancialData.saveFinancialData(
        stockCode, 
        dartResult.corpCode,
        dartResult.name, 
        yearlyData, 
        this.currentDataYear
      );
      
      console.log(`✅ ${stockCode} 재무데이터 수집 및 캐시 저장 완료`);
      
      return {
        stockCode: stockCode,
        name: dartResult.name,
        revenue: dartResult.revenue,
        netIncome: dartResult.netIncome,
        revenueGrowth3Y: dartResult.revenueGrowth3Y,
        netIncomeGrowth3Y: dartResult.netIncomeGrowth3Y,
        sharesOutstanding: sharesOutstanding,
        dataSource: 'FRESH_DART',
        lastUpdated: new Date(),
        allYearsData: yearlyData
      };
      
    } catch (error) {
      console.error(`재무데이터 수집 실패 (${stockCode}):`, error);
      return null;
    }
  }
  
  // 전체 종목 재무데이터 일괄 수집 (연 1회 실행용)
  async bulkCollectFinancialData(stockCodes, batchSize = 10) {
    console.log(`🚀 ${stockCodes.length}개 종목 재무데이터 일괄 수집 시작 (배치 크기: ${batchSize})`);
    
    const results = {
      total: stockCodes.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    // 배치 단위로 처리
    for (let i = 0; i < stockCodes.length; i += batchSize) {
      const batch = stockCodes.slice(i, i + batchSize);
      console.log(`📦 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(stockCodes.length/batchSize)} 처리 중...`);
      
      const batchPromises = batch.map(async (stockCode) => {
        try {
          // 이미 최신 데이터가 있는지 확인
          const existing = await FinancialData.findOne({ 
            stockCode: stockCode, 
            dataYear: this.currentDataYear 
          });
          
          if (existing) {
            console.log(`⏭️ ${stockCode} 이미 ${this.currentDataYear}년 데이터 존재, 건너뛰기`);
            results.skipped++;
            return null;
          }
          
          const result = await this.collectAndCacheFinancialData(stockCode);
          if (result) {
            results.success++;
          } else {
            results.failed++;
          }
          return result;
          
        } catch (error) {
          console.error(`${stockCode} 처리 실패:`, error.message);
          results.failed++;
          results.errors.push({ stockCode, error: error.message });
          return null;
        }
      });
      
      await Promise.all(batchPromises);
      
      // 배치 간 대기 (API Rate Limit 고려)
      if (i + batchSize < stockCodes.length) {
        console.log('⏳ 2초 대기...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`🏁 재무데이터 일괄 수집 완료:`, results);
    return results;
  }
  
  // 캐시 통계 조회
  async getCacheStatistics() {
    try {
      const stats = await FinancialData.aggregate([
        {
          $group: {
            _id: '$dataYear',
            count: { $sum: 1 },
            uniqueStocks: { $addToSet: '$stockCode' },
            lastUpdated: { $max: '$lastUpdated' }
          }
        },
        {
          $addFields: {
            uniqueStockCount: { $size: '$uniqueStocks' }
          }
        },
        {
          $sort: { _id: -1 }
        }
      ]);
      
      return stats.map(stat => ({
        dataYear: stat._id,
        totalRecords: stat.count,
        uniqueStocks: stat.uniqueStockCount,
        lastUpdated: stat.lastUpdated
      }));
      
    } catch (error) {
      console.error('캐시 통계 조회 실패:', error);
      return [];
    }
  }
  
  // 오래된 캐시 데이터 정리 (2년 이상 된 데이터)
  async cleanupOldCache(keepYears = 2) {
    try {
      const cutoffYear = this.currentDataYear - keepYears;
      const result = await FinancialData.deleteMany({
        dataYear: { $lt: cutoffYear }
      });
      
      console.log(`🧹 ${result.deletedCount}개 오래된 재무데이터 정리 완료 (${cutoffYear}년 이전)`);
      return result.deletedCount;
      
    } catch (error) {
      console.error('캐시 데이터 정리 실패:', error);
      return 0;
    }
  }
  
  // 재무데이터 년도 업데이트 체크 (4월 1일 체크용)
  checkDataYearUpdate() {
    const now = new Date();
    const newTargetYear = now.getMonth() >= 3 ? 
      this.currentDataYear - 1 : 
      this.currentDataYear - 2;
      
    if (newTargetYear !== this.targetYear) {
      console.log(`📅 재무데이터 대상년도 업데이트: ${this.targetYear} → ${newTargetYear}`);
      this.targetYear = newTargetYear;
      return true;
    }
    return false;
  }
}

module.exports = new FinancialDataCacheService();