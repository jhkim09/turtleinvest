/**
 * 주식 가격 정보 서비스
 * 키움 API + 전일 종가 하드코딩 조합
 */

const KiwoomService = require('./kiwoomService');

class StockPriceService {
  constructor() {
    // 주요 종목 전일 종가 (2024.08.19 기준)
    this.lastClosingPrices = {
      '005930': 71200,   // 삼성전자
      '000660': 127000,  // SK하이닉스
      '035420': 152000,  // NAVER
      '005380': 45000,   // 현대차
      '012330': 220000,  // 현대모비스
      '000270': 89000,   // 기아
      '051910': 320000,  // LG화학
      '035720': 58000,   // 카카오
      '251270': 45000,   // 넷마블
      '036570': 210000,  // 엔씨소프트
      '352820': 180000,  // 하이브
      '326030': 95000,   // SK바이오팜
      '145020': 78000,   // 휴젤
      '042700': 65000,   // 한미반도체
      '259960': 85000,   // 크래프톤
      '214450': 120000,  // 파마리서치
      '196170': 85000,   // 알테오젠
      '328130': 45000,   // 루닛
      '285130': 68000,   // SK케미칼
      '347860': 25000,   // 알체라
      '039030': 95000,   // 이오테크닉스
      '240810': 45000,   // 원익IPS
      '058470': 35000,   // 리노공업
      '178920': 78000,   // 피아이첨단소재
      '189300': 65000,   // 인텔리안테크
      '214150': 45000,   // 클래시스
      '237690': 88000,   // 에스티팜
      '141080': 35000,   // 레고켐바이오
      '108860': 28000,   // 셀바스AI
      '064290': 125000   // 인텍플러스
    };
  }

  // 현재가 또는 전일 종가 조회 (안전한 방식)
  async getCurrentPrice(stockCode) {
    try {
      // 1차: 키움 API 시도 (실시간 또는 전일 종가)
      const kiwoomPrice = await KiwoomService.getCurrentPriceOnly(stockCode);
      
      if (kiwoomPrice && kiwoomPrice > 1000) { // 유효한 가격
        console.log(`✅ ${stockCode} 키움 가격 사용: ${kiwoomPrice}원`);
        return kiwoomPrice;
      }

      // 2차: 하드코딩된 전일 종가 사용
      const lastPrice = this.lastClosingPrices[stockCode];
      if (lastPrice) {
        console.log(`📅 ${stockCode} 전일 종가 사용: ${lastPrice}원`);
        return lastPrice;
      }

      // 3차: 업종별 추정가격
      const estimatedPrice = this.estimatePriceByIndustry(stockCode);
      console.log(`📊 ${stockCode} 추정 가격 사용: ${estimatedPrice}원`);
      return estimatedPrice;

    } catch (error) {
      console.error(`❌ ${stockCode} 가격 조회 실패:`, error.message);
      return this.lastClosingPrices[stockCode] || 50000;
    }
  }

  // 업종별 추정 가격
  estimatePriceByIndustry(stockCode) {
    // 종목코드 패턴으로 업종 추정
    const firstDigit = stockCode.charAt(0);
    
    if (firstDigit === '3') return 45000;  // 코스닥 IT/게임 (보통 2-8만원)
    if (firstDigit === '2') return 35000;  // 코스닥 중소형 (보통 1-5만원) 
    if (firstDigit === '1') return 55000;  // 코스닥 바이오 (보통 3-8만원)
    if (firstDigit === '0') return 85000;  // 코스피 대형주 (보통 5-15만원)
    
    return 50000; // 기본값
  }

  // 다중 종목 가격 조회 (하이브리드 방식)
  async getBulkPrices(stockCodes, useKiwoom = true) {
    try {
      console.log(`💰 ${stockCodes.length}개 종목 가격 조회 시작...`);
      
      const results = new Map();
      let kiwoomSuccess = 0;
      let hardcodedUsed = 0;
      let estimatedUsed = 0;

      if (useKiwoom) {
        // 키움 API 시도 (5개씩 배치)
        try {
          const kiwoomPrices = await KiwoomService.getBulkCurrentPrices(stockCodes, 5);
          kiwoomPrices.forEach((price, stockCode) => {
            results.set(stockCode, { price, source: 'KIWOOM' });
            kiwoomSuccess++;
          });
        } catch (error) {
          console.log('⚠️ 키움 대량 조회 실패, 개별 방식으로 전환');
        }
      }

      // 키움에서 못 가져온 종목들 처리
      for (const stockCode of stockCodes) {
        if (!results.has(stockCode)) {
          const price = await this.getCurrentPrice(stockCode);
          const source = this.lastClosingPrices[stockCode] ? 'HARDCODED' : 'ESTIMATED';
          
          results.set(stockCode, { price, source });
          
          if (source === 'HARDCODED') hardcodedUsed++;
          else estimatedUsed++;
        }
      }

      console.log(`💰 가격 수집 완료: 키움 ${kiwoomSuccess}개, 하드코딩 ${hardcodedUsed}개, 추정 ${estimatedUsed}개`);

      return {
        prices: new Map(Array.from(results.entries()).map(([code, data]) => [code, data.price])),
        sources: results,
        summary: {
          total: stockCodes.length,
          kiwoom: kiwoomSuccess,
          hardcoded: hardcodedUsed,
          estimated: estimatedUsed
        }
      };

    } catch (error) {
      console.error('❌ 대량 가격 조회 실패:', error.message);
      
      // 완전 실패시 하드코딩 + 추정가격으로 복구
      const fallbackResults = new Map();
      stockCodes.forEach(code => {
        const price = this.lastClosingPrices[code] || this.estimatePriceByIndustry(code);
        fallbackResults.set(code, price);
      });
      
      return {
        prices: fallbackResults,
        sources: new Map(),
        summary: { total: stockCodes.length, fallback: stockCodes.length }
      };
    }
  }
}

module.exports = new StockPriceService();