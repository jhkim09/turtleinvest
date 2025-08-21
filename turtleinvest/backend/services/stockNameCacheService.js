/**
 * 종목명 캐시 서비스
 * 터틀/슈퍼스톡스 공통으로 사용할 회사명 매핑
 */

const StockName = require('../models/StockName');

class StockNameCacheService {
  constructor() {
    // 메모리 캐시 (빠른 조회용)
    this.memoryCache = new Map();
    this.lastCacheUpdate = null;
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24시간
  }

  // 종목명 조회 (메모리 캐시 → DB → fallback 순서)
  async getStockName(stockCode) {
    try {
      // 1. 메모리 캐시 확인
      if (this.memoryCache.has(stockCode)) {
        return this.memoryCache.get(stockCode);
      }

      // 2. DB에서 조회
      const dbName = await StockName.getStockName(stockCode);
      if (dbName) {
        this.memoryCache.set(stockCode, dbName);
        return dbName;
      }

      // 3. Fallback: 업종 추정 방식
      const fallbackName = this.generateFallbackName(stockCode);
      this.memoryCache.set(stockCode, fallbackName);
      return fallbackName;

    } catch (error) {
      console.error(`종목명 조회 실패 (${stockCode}):`, error.message);
      return this.generateFallbackName(stockCode);
    }
  }

  // 대량 종목명 조회
  async getBulkStockNames(stockCodes) {
    try {
      console.log(`📋 ${stockCodes.length}개 종목명 대량 조회...`);
      
      const results = new Map();
      
      // 1. 메모리 캐시에서 먼저 찾기
      const uncachedCodes = [];
      stockCodes.forEach(code => {
        if (this.memoryCache.has(code)) {
          results.set(code, this.memoryCache.get(code));
        } else {
          uncachedCodes.push(code);
        }
      });

      console.log(`💾 메모리 캐시 적중: ${results.size}개, DB 조회 필요: ${uncachedCodes.length}개`);

      // 2. DB에서 남은 종목들 조회
      if (uncachedCodes.length > 0) {
        const dbNames = await StockName.getBulkStockNames(uncachedCodes);
        
        // DB 결과를 메모리 캐시에도 저장
        dbNames.forEach((name, code) => {
          results.set(code, name);
          this.memoryCache.set(code, name);
        });

        // 3. DB에서도 못 찾은 종목들은 fallback 생성
        uncachedCodes.forEach(code => {
          if (!results.has(code)) {
            const fallbackName = this.generateFallbackName(code);
            results.set(code, fallbackName);
            this.memoryCache.set(code, fallbackName);
          }
        });
      }

      console.log(`✅ 종목명 조회 완료: DB ${results.size - (stockCodes.length - uncachedCodes.length)}개, fallback ${uncachedCodes.length - (results.size - (stockCodes.length - uncachedCodes.length))}개`);
      
      return results;

    } catch (error) {
      console.error('대량 종목명 조회 실패:', error.message);
      
      // 완전 실패시 fallback으로 모든 종목 처리
      const fallbackResults = new Map();
      stockCodes.forEach(code => {
        fallbackResults.set(code, this.generateFallbackName(code));
      });
      return fallbackResults;
    }
  }

  // Fallback 종목명 생성 (개선된 버전)
  generateFallbackName(stockCode) {
    // 하드코딩된 주요 종목명 (DB 연결 실패시 대비)
    const hardcodedNames = {
      '005930': '삼성전자',
      '000660': 'SK하이닉스', 
      '035420': 'NAVER',
      '005380': '현대차',
      '012330': '현대모비스',
      '000270': '기아',
      '051910': 'LG화학',
      '068270': '셀트리온',
      '251270': '넷마블',
      '036570': '엔씨소프트',
      '352820': '하이브',
      '326030': 'SK바이오팜',
      '259960': '크래프톤',
      '328130': '루닛',
      '237690': '에스티팜',
      '240810': '원익IPS',
      '200670': '휴메딕스',
      '290650': '엘앤씨바이오',
      '032500': '케이엠더블유',
      '141080': '레고켐바이오',
      '042700': '한미반도체',
      '145020': '휴젤'
    };
    
    // 하드코딩된 종목명이 있으면 사용
    if (hardcodedNames[stockCode]) {
      return hardcodedNames[stockCode];
    }
    
    // 기존 시장별 접두사 방식 (더 간결하게)
    const firstDigit = stockCode.charAt(0);
    if (firstDigit === '0' || firstDigit === '1') {
      return `코스피${stockCode}`; // 코스피
    } else if (firstDigit === '2') {
      return `코스닥${stockCode}`; // 코스닥
    } else if (firstDigit === '3') {
      return `종목${stockCode}`; // IT/게임 등
    } else {
      return `종목${stockCode}`; // 기타
    }
  }

  // DART에서 전체 상장사 데이터 가져와서 업데이트
  async updateAllListedCompanies() {
    try {
      console.log('🚀 DART API에서 전체 상장사 데이터 수집 시작...');
      
      const DartService = require('./dartService');
      const allCorpCodes = await DartService.loadAllCorpCodes();
      
      if (!allCorpCodes || allCorpCodes.size === 0) {
        throw new Error('DART에서 기업 데이터를 가져올 수 없습니다');
      }
      
      console.log(`📊 DART에서 ${allCorpCodes.size}개 기업 데이터 수집 완료`);
      
      let saved = 0;
      let updated = 0;
      let skipped = 0;
      
      // Map을 배열로 변환하여 처리
      const corpArray = Array.from(allCorpCodes.entries());
      
      for (const [stockCode, corpInfo] of corpArray) {
        try {
          // 유효한 6자리 종목코드만 처리
          if (!stockCode || !/^\d{6}$/.test(stockCode)) {
            skipped++;
            continue;
          }
          
          const companyName = corpInfo.corp_name || corpInfo.name || '회사명없음';
          
          // DB에서 기존 데이터 확인
          const existing = await StockName.findOne({ stockCode });
          
          if (existing) {
            // 기존 데이터 업데이트
            await StockName.updateOne(
              { stockCode },
              { 
                $set: { 
                  companyName: companyName,
                  market: this.determineMarket(stockCode),
                  corpCode: corpInfo.corp_code,
                  lastUpdated: new Date(),
                  dataSource: 'DART_API'
                }
              }
            );
            updated++;
          } else {
            // 신규 데이터 저장
            await StockName.saveStockName(stockCode, companyName, {
              market: this.determineMarket(stockCode),
              corpCode: corpInfo.corp_code,
              dataSource: 'DART_API'
            });
            saved++;
          }
          
          // 메모리 캐시에도 저장
          this.memoryCache.set(stockCode, companyName);
          
          // 진행률 표시 (100개마다)
          if ((saved + updated) % 100 === 0) {
            console.log(`📈 진행률: ${saved + updated}/${corpArray.length} 처리 중...`);
          }
          
        } catch (error) {
          console.error(`❌ ${stockCode} 처리 실패:`, error.message);
          skipped++;
        }
      }
      
      console.log(`✅ 전체 상장사 데이터 업데이트 완료:`);
      console.log(`   신규: ${saved}개`);
      console.log(`   업데이트: ${updated}개`);
      console.log(`   건너뜀: ${skipped}개`);
      
      return { saved, updated, skipped, total: corpArray.length };
      
    } catch (error) {
      console.error('❌ 전체 상장사 데이터 업데이트 실패:', error.message);
      throw error;
    }
  }

  // 종목코드로 시장 구분 (코스피/코스닥)
  determineMarket(stockCode) {
    const firstDigit = stockCode.charAt(0);
    if (firstDigit === '0' || firstDigit === '1') {
      return 'KOSPI';
    } else if (firstDigit === '2' || firstDigit === '3') {
      return 'KOSDAQ';
    } else {
      return 'ETC';
    }
  }

  // 실제 회사명 대량 저장 (초기 데이터 구축용)
  async populateStockNames() {
    try {
      console.log('🚀 종목명 캐시 데이터 구축 시작...');

      // 확실한 주요 종목들 (70개)
      const knownStocks = [
        // 코스피 대형주
        { code: '005930', name: '삼성전자', market: 'KOSPI' },
        { code: '000660', name: 'SK하이닉스', market: 'KOSPI' },
        { code: '035420', name: 'NAVER', market: 'KOSPI' },
        { code: '005380', name: '현대차', market: 'KOSPI' },
        { code: '012330', name: '현대모비스', market: 'KOSPI' },
        { code: '000270', name: '기아', market: 'KOSPI' },
        { code: '051910', name: 'LG화학', market: 'KOSPI' },
        { code: '068270', name: '셀트리온', market: 'KOSPI' },
        { code: '207940', name: '삼성바이오로직스', market: 'KOSPI' },
        { code: '323410', name: '카카오뱅크', market: 'KOSPI' },
        { code: '086790', name: '하나금융지주', market: 'KOSPI' },
        { code: '316140', name: '우리금융지주', market: 'KOSPI' },
        { code: '090430', name: '아모레퍼시픽', market: 'KOSPI' },
        { code: '002790', name: '아모레G', market: 'KOSPI' },
        { code: '002810', name: '삼성물산', market: 'KOSPI' },
        
        // 코스닥 주요주
        { code: '251270', name: '넷마블', market: 'KOSDAQ' },
        { code: '036570', name: '엔씨소프트', market: 'KOSDAQ' },
        { code: '352820', name: '하이브', market: 'KOSDAQ' },
        { code: '326030', name: 'SK바이오팜', market: 'KOSDAQ' },
        { code: '259960', name: '크래프톤', market: 'KOSDAQ' },
        { code: '293490', name: '카카오게임즈', market: 'KOSDAQ' },
        { code: '377300', name: '카카오페이', market: 'KOSDAQ' },
        { code: '042700', name: '한미반도체', market: 'KOSDAQ' },
        { code: '145020', name: '휴젤', market: 'KOSDAQ' },
        { code: '195940', name: 'HK이노엔', market: 'KOSDAQ' },
        
        // 바이오/제약
        { code: '214150', name: '클래시스', market: 'KOSDAQ' },
        { code: '214450', name: '파마리서치', market: 'KOSDAQ' },
        { code: '196170', name: '알테오젠', market: 'KOSDAQ' },
        { code: '328130', name: '루닛', market: 'KOSDAQ' },
        { code: '285130', name: 'SK케미칼', market: 'KOSDAQ' },
        { code: '347860', name: '알체라', market: 'KOSDAQ' },
        { code: '237690', name: '에스티팜', market: 'KOSDAQ' },
        { code: '141080', name: '레고켐바이오', market: 'KOSDAQ' },
        
        // IT/소프트웨어
        { code: '039030', name: '이오테크닉스', market: 'KOSDAQ' },
        { code: '240810', name: '원익IPS', market: 'KOSDAQ' },
        { code: '058470', name: '리노공업', market: 'KOSDAQ' },
        { code: '178920', name: '피아이첨단소재', market: 'KOSDAQ' },
        { code: '189300', name: '인텔리안테크', market: 'KOSDAQ' },
        { code: '108860', name: '셀바스AI', market: 'KOSDAQ' },
        { code: '064290', name: '인텍플러스', market: 'KOSDAQ' },
        { code: '112040', name: '위메이드', market: 'KOSDAQ' },
        
        // 최근 확인된 종목들
        { code: '200670', name: '휴메딕스', market: 'KOSDAQ' },
        { code: '298690', name: '에이스토리', market: 'KOSDAQ' },
        { code: '215200', name: '메가스터디교육', market: 'KOSDAQ' },
        { code: '252990', name: '샘씨엔에스', market: 'KOSDAQ' },
        { code: '300080', name: '플리토', market: 'KOSDAQ' },
        { code: '290650', name: '엘앤씨바이오', market: 'KOSDAQ' },
        { code: '032500', name: '케이엠더블유', market: 'KOSDAQ' }
      ];

      let saved = 0;
      let updated = 0;

      for (const stock of knownStocks) {
        try {
          const existing = await StockName.findOne({ stockCode: stock.code });
          
          if (existing) {
            await StockName.updateOne(
              { stockCode: stock.code },
              { 
                $set: { 
                  companyName: stock.name,
                  market: stock.market,
                  lastUpdated: new Date()
                }
              }
            );
            updated++;
          } else {
            await StockName.saveStockName(stock.code, stock.name, {
              market: stock.market,
              dataSource: 'MANUAL'
            });
            saved++;
          }

          // 메모리 캐시에도 저장
          this.memoryCache.set(stock.code, stock.name);

        } catch (error) {
          console.error(`❌ ${stock.code} 저장 실패:`, error.message);
        }
      }

      console.log(`✅ 종목명 캐시 구축 완료: 신규 ${saved}개, 업데이트 ${updated}개`);
      
      return { saved, updated, total: knownStocks.length };

    } catch (error) {
      console.error('❌ 종목명 캐시 구축 실패:', error.message);
      throw error;
    }
  }

  // 캐시 통계
  async getCacheStats() {
    try {
      const stats = await StockName.aggregate([
        {
          $group: {
            _id: '$market',
            count: { $sum: 1 },
            latestUpdate: { $max: '$lastUpdated' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const totalCount = await StockName.countDocuments({ isActive: true });

      return {
        total: totalCount,
        byMarket: stats,
        memoryCacheSize: this.memoryCache.size,
        lastUpdate: this.lastCacheUpdate
      };
    } catch (error) {
      console.error('캐시 통계 조회 실패:', error.message);
      return { total: 0, byMarket: [], memoryCacheSize: 0 };
    }
  }
}

module.exports = new StockNameCacheService();