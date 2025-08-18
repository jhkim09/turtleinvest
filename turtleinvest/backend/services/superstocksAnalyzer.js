const KiwoomService = require('./kiwoomService');
const DartService = require('./dartService');

class SuperstocksAnalyzer {
  
  constructor() {
    this.minRevenueGrowth = 15; // 최소 매출 성장률 (%)
    this.minNetIncomeGrowth = 15; // 최소 당기순이익 성장률 (%)
    this.maxPSR = 3.0; // 최대 PSR (시뮬레이션 데이터에 맞게 완화)
    this.analysisYears = 3; // 분석 기간 (년)
  }

  // 슈퍼스톡스 조건 분석 (시뮬레이션)
  async analyzeSuperstocks(symbols) {
    try {
      console.log('📈 슈퍼스톡스 분석 시작...');
      
      const results = [];
      
      for (const symbol of symbols) {
        try {
          const analysis = await this.analyzeStock(symbol);
          if (analysis) {
            results.push(analysis);
          }
        } catch (error) {
          console.error(`${symbol} 분석 실패:`, error.message);
        }
      }
      
      // 모든 분석 결과 반환 (조건 만족 여부와 관계없이)
      const validResults = results.filter(stock => stock !== null);
      
      // 조건 만족하는 종목 카운트
      const qualifiedStocks = validResults.filter(stock => 
        stock.revenueGrowth3Y >= this.minRevenueGrowth &&
        stock.netIncomeGrowth3Y >= this.minNetIncomeGrowth &&
        stock.psr <= this.maxPSR
      );
      
      console.log(`✅ 슈퍼스톡스 분석 완료: 총 ${validResults.length}개 분석, ${qualifiedStocks.length}개 조건 만족`);
      
      return validResults; // 모든 분석 결과 반환
      
    } catch (error) {
      console.error('슈퍼스톡스 분석 실패:', error);
      return [];
    }
  }
  
  // 개별 종목 분석 (DART API 실제 데이터)
  async analyzeStock(symbol) {
    try {
      console.log(`📊 ${symbol} 슈퍼스톡스 분석 시작...`);
      
      // 1. 현재가 조회 (키움 API)
      const currentPrice = await KiwoomService.getCurrentPrice(symbol);
      
      // 2. 임시로 시뮬레이션 데이터 사용 (DART API 문제 해결 전까지)
      const simData = this.generateSimulationFinancials(symbol);
      const financialData = {
        stockCode: null, // 시뮬레이션 표시
        revenue: simData.revenue,
        netIncome: simData.netIncome,
        revenueGrowth3Y: this.calculateGrowthRate(simData.revenueHistory),
        netIncomeGrowth3Y: this.calculateGrowthRate(simData.netIncomeHistory),
        revenueHistory: simData.revenueHistory,
        netIncomeHistory: simData.netIncomeHistory
      };
      
      // 4. PSR 계산 (시가총액 / 매출액)
      const estimatedShares = this.estimateSharesOutstanding(symbol, currentPrice, financialData.revenue);
      const marketCap = currentPrice * estimatedShares;
      const psr = financialData.revenue > 0 ? marketCap / (financialData.revenue * 100000000) : 999;
      
      // 조건 확인
      const meetsConditions = (
        financialData.revenueGrowth3Y >= this.minRevenueGrowth &&
        financialData.netIncomeGrowth3Y >= this.minNetIncomeGrowth &&
        psr <= this.maxPSR
      );
      
      console.log(`📊 ${symbol} 완료: 현재가 ${currentPrice}원, 매출성장률 ${financialData.revenueGrowth3Y}%, 순이익성장률 ${financialData.netIncomeGrowth3Y}%, PSR ${psr.toFixed(2)}, 조건만족: ${meetsConditions}`);
      
      // 5. 결과 반환
      return {
        symbol: symbol,
        name: this.getStockName(symbol),
        currentPrice: currentPrice,
        revenueGrowth3Y: financialData.revenueGrowth3Y,
        netIncomeGrowth3Y: financialData.netIncomeGrowth3Y,
        psr: Math.round(psr * 100) / 100, // 소수점 2자리
        marketCap: marketCap,
        revenue: financialData.revenue,
        netIncome: financialData.netIncome,
        dataSource: financialData.stockCode ? 'DART' : 'SIMULATION',
        score: this.calculateScore(financialData.revenueGrowth3Y, financialData.netIncomeGrowth3Y, psr),
        meetsConditions: meetsConditions,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`${symbol} 분석 실패:`, error);
      return null;
    }
  }
  
  // 상장주식수 추정 (시가총액 역산)
  estimateSharesOutstanding(symbol, currentPrice, revenueInBillion) {
    // 대략적인 상장주식수 추정 (업종별 특성 고려)
    const estimates = {
      '005930': 5969782550,  // 삼성전자
      '000660': 728002365,   // SK하이닉스
      '035420': 164688891,   // NAVER
      '005380': 2924634238,  // 현대차
      '012330': 41800000     // 현대모비스
    };
    
    if (estimates[symbol]) {
      return estimates[symbol];
    }
    
    // 추정: 매출액 기준 상장주식수 역산
    // 일반적으로 PSR 1-3 범위에서 거래되므로 중간값 2 사용
    const estimatedMarketCap = revenueInBillion * 100000000 * 2; // PSR 2 가정
    return Math.round(estimatedMarketCap / currentPrice);
  }
  
  // 시뮬레이션 재무 데이터 생성
  generateSimulationFinancials(symbol) {
    const stockData = {
      '005930': { // 삼성전자
        revenue: 2790000, // 억원
        netIncome: 265000,
        sharesOutstanding: 5969782550,
        revenueHistory: [2368000, 2435000, 2790000], // 3년간
        netIncomeHistory: [264800, 226600, 265000]
      },
      '000660': { // SK하이닉스
        revenue: 737000,
        netIncome: 18500,
        sharesOutstanding: 728002365,
        revenueHistory: [268900, 368000, 737000],
        netIncomeHistory: [-9500, 59500, 18500]
      },
      '035420': { // NAVER
        revenue: 89000,
        netIncome: 13500,
        sharesOutstanding: 164688891,
        revenueHistory: [77000, 82000, 89000],
        netIncomeHistory: [11000, 12000, 13500]
      }
    };
    
    return stockData[symbol] || {
      revenue: Math.random() * 100000 + 50000,
      netIncome: Math.random() * 10000 + 5000,
      sharesOutstanding: Math.random() * 1000000000 + 100000000,
      revenueHistory: [
        Math.random() * 80000 + 40000,
        Math.random() * 90000 + 45000,
        Math.random() * 100000 + 50000
      ],
      netIncomeHistory: [
        Math.random() * 8000 + 4000,
        Math.random() * 9000 + 4500,
        Math.random() * 10000 + 5000
      ]
    };
  }
  
  // 성장률 계산 (연평균)
  calculateGrowthRate(history) {
    if (history.length < 2) return 0;
    
    const startValue = history[0];
    const endValue = history[history.length - 1];
    const years = history.length - 1;
    
    if (startValue <= 0) return 0;
    
    const growthRate = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
    return Math.round(growthRate * 100) / 100; // 소수점 2자리
  }
  
  // 종목명 반환
  getStockName(symbol) {
    const names = {
      '005930': '삼성전자',
      '000660': 'SK하이닉스',
      '035420': 'NAVER',
      '005380': '현대차',
      '012330': '현대모비스'
    };
    return names[symbol] || `종목${symbol}`;
  }
  
  // 종합 점수 계산
  calculateScore(revenueGrowth, netIncomeGrowth, psr) {
    let score = 0;
    
    // 매출 성장률 점수
    if (revenueGrowth >= 20) score += 40;
    else if (revenueGrowth >= 15) score += 30;
    else if (revenueGrowth >= 10) score += 20;
    
    // 순이익 성장률 점수
    if (netIncomeGrowth >= 20) score += 40;
    else if (netIncomeGrowth >= 15) score += 30;
    else if (netIncomeGrowth >= 10) score += 20;
    
    // PSR 점수
    if (psr <= 0.5) score += 20;
    else if (psr <= 0.75) score += 10;
    
    // 점수별 등급
    if (score >= 80) return 'EXCELLENT';
    else if (score >= 60) return 'GOOD';
    else if (score >= 40) return 'FAIR';
    else return 'POOR';
  }
  
  // 코스피 상위 10 + 코스닥 주요 종목 리스트  
  getDefaultStockList() {
    return [
      // === 코스피 상위 10종목 ===
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
      
      // === 코스닥 주요 종목들 ===
      '251270', // 넷마블
      '036570', // 엔씨소프트
      '352820', // 하이브
      '377300', // 카카오페이
      '259960', // 크래프톤
      '293490', // 카카오게임즈
      '263750', // 펄어비스
      '095660', // 네오위즈
      '112040', // 위메이드
      '299900', // 위지트
      
      // 코스닥 바이오
      '326030', // SK바이오팜
      '145020', // 휴젤
      '195940', // HK이노엔
      '214150', // 클래시스
      '214450', // 파마리서치
      '009420', // 한올바이오파마
      '285130', // SK케미칼
      
      // 코스닥 IT/반도체
      '042700', // 한미반도체
      '000990', // DB하이텍
      '058470', // 리노공업
      '240810', // 원익IPS
      '064290', // 인텍플러스
      '039030', // 이오테크닉스
      '131970', // 두산테스나
      '108860', // 셀바스AI
      '065660', // 안트로젠
      '196170', // 알테오젠
      
      // 코스닥 성장주
      '347860', // 알체라
      '357120', // 코람코에너지리츠
      '053610', // 프로텍
      '067310', // 하나마이크론
      '178920', // 피아이첨단소재
      '226330', // 신테카바이오
      '256940', // NAVER클라우드플랫폼
      '067160', // 아프리카TV
      '078600', // 대주전자재료
      '222080'  // 씨아이에스
    ];
  }
}

module.exports = new SuperstocksAnalyzer();