const KiwoomService = require('./kiwoomService');

class SuperstocksAnalyzer {
  
  constructor() {
    this.minRevenueGrowth = 15; // 최소 매출 성장률 (%)
    this.minNetIncomeGrowth = 15; // 최소 당기순이익 성장률 (%)
    this.maxPSR = 0.75; // 최대 PSR
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
      
      // 조건 만족하는 종목만 필터링
      const qualifiedStocks = results.filter(stock => 
        stock.revenueGrowth3Y >= this.minRevenueGrowth &&
        stock.netIncomeGrowth3Y >= this.minNetIncomeGrowth &&
        stock.psr <= this.maxPSR
      );
      
      console.log(`✅ 슈퍼스톡스 분석 완료: ${qualifiedStocks.length}개 발견`);
      
      return qualifiedStocks;
      
    } catch (error) {
      console.error('슈퍼스톡스 분석 실패:', error);
      return [];
    }
  }
  
  // 개별 종목 분석 (시뮬레이션 데이터)
  async analyzeStock(symbol) {
    try {
      // 현재가 조회
      const currentPrice = await KiwoomService.getCurrentPrice(symbol);
      
      // 시뮬레이션 재무 데이터 생성
      const financialData = this.generateSimulationFinancials(symbol);
      
      // PSR 계산 (시가총액 / 매출액)
      const marketCap = currentPrice * financialData.sharesOutstanding;
      const psr = marketCap / financialData.revenue;
      
      // 성장률 계산
      const revenueGrowth3Y = this.calculateGrowthRate(financialData.revenueHistory);
      const netIncomeGrowth3Y = this.calculateGrowthRate(financialData.netIncomeHistory);
      
      return {
        symbol: symbol,
        name: this.getStockName(symbol),
        currentPrice: currentPrice,
        revenueGrowth3Y: revenueGrowth3Y,
        netIncomeGrowth3Y: netIncomeGrowth3Y,
        psr: psr,
        marketCap: marketCap,
        revenue: financialData.revenue,
        netIncome: financialData.netIncome,
        score: this.calculateScore(revenueGrowth3Y, netIncomeGrowth3Y, psr),
        meetsConditions: (
          revenueGrowth3Y >= this.minRevenueGrowth &&
          netIncomeGrowth3Y >= this.minNetIncomeGrowth &&
          psr <= this.maxPSR
        ),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`${symbol} 분석 실패:`, error);
      return null;
    }
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
  
  // 기본 분석 대상 종목 리스트
  getDefaultStockList() {
    return [
      '005930', // 삼성전자
      '000660', // SK하이닉스
      '035420', // NAVER
      '005380', // 현대차
      '012330', // 현대모비스
      '000270', // 기아
      '105560', // KB금융
      '055550', // 신한지주
      '035720', // 카카오
      '051910'  // LG화학
    ];
  }
}

module.exports = new SuperstocksAnalyzer();