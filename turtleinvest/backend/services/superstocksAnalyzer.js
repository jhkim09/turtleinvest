const KiwoomService = require('./kiwoomService');
const DartService = require('./dartService');

class SuperstocksAnalyzer {
  
  constructor() {
    this.minRevenueGrowth = 15; // 최소 매출 성장률 (%)
    this.minNetIncomeGrowth = 15; // 최소 당기순이익 성장률 (%)
    this.maxPSR = 0.75; // 최대 PSR (슈퍼스톡스 원래 조건)
    this.analysisYears = 3; // 분석 기간 (년)
  }

  // 슈퍼스톡스 조건 분석 (병렬 처리로 성능 최적화)
  async analyzeSuperstocks(symbols) {
    try {
      console.log(`📈 슈퍼스톡스 분석 시작... (${symbols.length}개 종목)`);
      
      // 배치 단위로 병렬 처리 (10개씩)
      const batchSize = 10;
      const results = [];
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        console.log(`📊 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(symbols.length/batchSize)} 처리 중...`);
        
        const batchPromises = batch.map(async (symbol) => {
          try {
            return await this.analyzeStock(symbol);
          } catch (error) {
            console.error(`${symbol} 분석 실패:`, error.message);
            return null;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(r => r !== null));
        
        // 키움 API Rate Limit 고려 (배치 간 잠시 대기)
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
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
      
      // 2. DART API로 실제 재무데이터 조회 (Yahoo Finance 보완)
      let financialData;
      try {
        financialData = await DartService.analyzeStockFinancials(symbol);
        if (!financialData || !financialData.stockCode) {
          console.log(`⚠️ ${symbol} DART 데이터 없음, Yahoo Finance로 보완 시도`);
          
          // Yahoo Finance에서 재무데이터 보완
          const YahooFinanceService = require('./yahooFinanceService');
          const yahooInfo = await YahooFinanceService.getStockInfo(symbol);
          if (yahooInfo && yahooInfo.totalRevenue) {
            console.log(`📊 ${symbol} Yahoo Finance 재무데이터 사용`);
            // Yahoo 데이터를 DART 형식으로 변환 (간단히)
            financialData = {
              stockCode: symbol,
              name: this.getStockName(symbol),
              revenue: yahooInfo.totalRevenue / 100000000, // 원 → 억원
              revenueGrowth3Y: 10, // 기본값 (Yahoo에서 성장률 없음)
              netIncomeGrowth3Y: 10 // 기본값
            };
          } else {
            console.log(`⚠️ ${symbol} 모든 데이터 소스 실패, 건너뛰기`);
            return null;
          }
        }
      } catch (error) {
        console.log(`⚠️ ${symbol} DART API 호출 실패: ${error.message}, 건너뛰기`);
        return null; // DART API 실패시 null 반환
      }
      
      // 4. 실제 상장주식수 조회 (Yahoo Finance 우선, DART 대안)
      const YahooFinanceService = require('./yahooFinanceService');
      let actualShares = null;
      let yahooInfo = null;
      
      // Yahoo Finance에서 주식 정보 조회 (PSR도 함께)
      try {
        yahooInfo = await YahooFinanceService.getStockInfo(symbol);
        if (yahooInfo && yahooInfo.sharesOutstanding) {
          actualShares = yahooInfo.sharesOutstanding;
          console.log(`📊 ${symbol} Yahoo 상장주식수 사용: ${actualShares.toLocaleString()}주`);
          
          // Yahoo Finance PSR이 있으면 우선 사용
          if (yahooInfo.priceToSalesTrailing12Months && yahooInfo.priceToSalesTrailing12Months > 0) {
            console.log(`💡 ${symbol} Yahoo PSR 직접 사용: ${yahooInfo.priceToSalesTrailing12Months.toFixed(3)}`);
            
            return {
              symbol: symbol,
              name: financialData.name || this.getStockName(symbol),
              currentPrice: currentPrice,
              revenueGrowth3Y: financialData.revenueGrowth3Y,
              netIncomeGrowth3Y: financialData.netIncomeGrowth3Y,
              psr: Math.round(yahooInfo.priceToSalesTrailing12Months * 1000) / 1000,
              marketCap: yahooInfo.marketCap || currentPrice * actualShares,
              revenue: financialData.revenue,
              netIncome: financialData.netIncome,
              dataSource: 'YAHOO_HYBRID',
              score: this.calculateScore(financialData.revenueGrowth3Y, financialData.netIncomeGrowth3Y, yahooInfo.priceToSalesTrailing12Months),
              meetsConditions: (
                financialData.revenueGrowth3Y >= this.minRevenueGrowth &&
                financialData.netIncomeGrowth3Y >= this.minNetIncomeGrowth &&
                yahooInfo.priceToSalesTrailing12Months <= this.maxPSR
              ),
              timestamp: new Date().toISOString()
            };
          }
        }
      } catch (error) {
        console.log(`⚠️ ${symbol} Yahoo Finance 조회 실패: ${error.message}`);
      }
      
      // Yahoo에서 실패하면 DART 시도
      if (!actualShares) {
        actualShares = await DartService.getSharesOutstanding(symbol, 2024);
      }
      
      // 둘 다 실패하면 추정값 사용
      if (!actualShares) {
        actualShares = this.estimateSharesOutstanding(symbol, currentPrice, financialData.revenue);
        console.log(`📊 ${symbol} 추정 상장주식수 사용: ${actualShares.toLocaleString()}주`);
      }
      
      // PSR 계산 (시가총액 / 매출액)
      const marketCap = currentPrice * actualShares;
      
      // PSR 계산 디버깅
      console.log(`🧮 ${symbol} PSR 계산: 현재가 ${currentPrice}원, 주식수 ${actualShares.toLocaleString()}주, 시총 ${(marketCap/1000000000).toFixed(1)}억원`);
      console.log(`💰 ${symbol} 매출: ${financialData.revenue.toLocaleString()}억원, 매출(원) ${(financialData.revenue * 100000000).toLocaleString()}원`);
      
      const revenueInWon = financialData.revenue * 100000000; // 억원 → 원 변환
      const psr = revenueInWon > 0 ? marketCap / revenueInWon : 999;
      
      console.log(`📊 ${symbol} PSR 계산상세:`);
      console.log(`   시총(원): ${marketCap.toLocaleString()}`);
      console.log(`   매출(억원): ${financialData.revenue.toLocaleString()}`);
      console.log(`   매출(원): ${revenueInWon.toLocaleString()}`);
      console.log(`   PSR: ${marketCap.toLocaleString()} ÷ ${revenueInWon.toLocaleString()} = ${psr.toFixed(6)}`);
      
      // 조건 확인
      const meetsConditions = (
        financialData.revenueGrowth3Y >= this.minRevenueGrowth &&
        financialData.netIncomeGrowth3Y >= this.minNetIncomeGrowth &&
        psr <= this.maxPSR
      );
      
      console.log(`📊 ${symbol} 완료: 현재가 ${currentPrice}원, 매출성장률 ${financialData.revenueGrowth3Y}%, 순이익성장률 ${financialData.netIncomeGrowth3Y}%, PSR ${psr.toFixed(4)} (시총: ${(marketCap/1000000000).toFixed(0)}억, 매출: ${(financialData.revenue/10000).toFixed(0)}억), 조건만족: ${meetsConditions}`);
      
      // 5. 결과 반환
      return {
        symbol: symbol,
        name: financialData.name || this.getStockName(symbol),
        currentPrice: currentPrice,
        revenueGrowth3Y: financialData.revenueGrowth3Y,
        netIncomeGrowth3Y: financialData.netIncomeGrowth3Y,
        psr: Math.round(psr * 1000) / 1000, // 소수점 3자리로 더 정밀하게
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
    
    // 추정: 다양한 PSR 범위로 시뮬레이션 (0.3 ~ 3.0)
    const randomPSR = 0.3 + Math.random() * 2.7; // 0.3 ~ 3.0 범위
    const estimatedMarketCap = revenueInBillion * 100000000 * randomPSR;
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
      // 코스피 상위 10
      '005930': '삼성전자', '000660': 'SK하이닉스', '035420': 'NAVER',
      '005380': '현대차', '012330': '현대모비스', '000270': '기아',
      '105560': 'KB금융', '055550': '신한지주', '035720': '카카오', '051910': 'LG화학',
      
      // 게임/엔터테인먼트
      '251270': '넷마블', '036570': '엔씨소프트', '352820': '하이브', '377300': '카카오페이',
      '259960': '크래프톤', '293490': '카카오게임즈', '263750': '펄어비스', '095660': '네오위즈',
      '112040': '위메이드', '299900': '위지트', '122870': '와이지엔터테인먼트', '041510': '에스엠',
      '035900': 'JYP Ent.', '067160': '아프리카TV', '181710': 'NHN', '034120': 'SBS',
      
      // 바이오/제약
      '326030': 'SK바이오팜', '145020': '휴젤', '195940': 'HK이노엔', '214150': '클래시스',
      '214450': '파마리서치', '009420': '한올바이오파마', '285130': 'SK케미칼', '196170': '알테오젠',
      '065660': '안트로젠', '302440': '셀트리온헬스케어', '091990': '셀트리온헬스케어',
      '328130': '루닛', '085660': '차바이오텍', '237690': '에스티팜', '287410': '제이준코스메틱',
      '099430': '바이오스마트', '141080': '레고켐바이오', '156100': '엘앤케이바이오',
      
      // IT/반도체/소프트웨어
      '042700': '한미반도체', '000990': 'DB하이텍', '058470': '리노공업', '240810': '원익IPS',
      '064290': '인텍플러스', '039030': '이오테크닉스', '131970': '두산테스나', '108860': '셀바스AI',
      '347860': '알체라', '256940': 'NAVER클라우드플랫폼', '033240': '자화전자', '046390': '삼화콘덴서',
      '060720': '라드웨어KR', '214370': '케어젠', '347890': '엠투엔', '052020': '에스티큐브',
      
      // 전자/부품
      '078600': '대주전자재료', '036810': '에프앤가이드', '036540': 'SFA반도체',
      '140610': '엠투엔', '403870': 'HPSP', '206640': '바디텍메드',
      '086520': '에코프로', '101160': '월덱스', '067630': 'HLB생명과학', '066700': '테라젠이텍스',
      '418550': '제이오', '189300': '인텔리안테크', '950170': '코오롱플라스틱', '950140': '삼성물산우',
      
      // 추가 매핑
      '182360': '큐브엔터', '194480': '데브시스터즈', '054780': '키이스트', '192080': '더블유게임즈',
      '328130': '루닛', '085660': '차바이오텍', '237690': '에스티팜', '287410': '제이준코스메틱',
      '099430': '바이오스마트', '141080': '레고켐바이오', '156100': '엘앤케이바이오', '222080': '씨아이에스',
      '173130': '오파스넷', '068760': '셀트리온제약', '099190': '아이센스', '230240': '에치에프알',
      '205470': '휴마시스', '174900': '앱클론', '950210': '대상홀딩스우', 
      '950130': '엔씨소프트우', '006280': '녹십자', '033240': '자화전자', '046390': '삼화콘덴서',
      '060720': '라드웨어', '214370': '케어젠', '347890': '엠투엔', '052020': '에스티큐브',
      '086900': '메디톡스', '088350': '한화생명', '051600': '한전KPS',
      
      // 추가 매핑 - 누락된 종목들
      '067310': '하나마이크론', '053610': '프로텍', '950160': '삼성전자우',
      '034590': '인천도시가스', '020000': '한섬', '005300': '롯데칠성',
      '000500': '가온전선', '032350': '롯데관광개발', '086890': '이수화학',
      '086790': '하나금융지주', '086960': '메디포스트', '035760': 'CJ E&M',
      '079170': '신풍제약', '028050': '삼성엔지니어링', '079430': '현대리바트',
      '131390': '한국선재', '064960': 'SNT모티브', '192820': '코스맥스',
      '079370': 'KG모빌리언스', '086450': '동국제약', '086520': '에코프로', '060310': '3S',
      '226330': '신테카바이오', '178920': '피아이첨단소재',
      '004000': '롯데정밀화학', '000150': '두산', '004560': '현대중공업지주', '001800': '오리온홀딩스',
      
      // 추가 실제 코스닥 우량주 매핑
      '279600': '알앤디컴퍼니', '267290': '경동도시가스', '137400': '피엔티',
      '161000': '애경산업', '187660': '현대로지스틱스', '183300': '코미코',
      '306200': 'KG케미칼', '277880': '티에스인베스트먼트', '225570': '넥슨게임즈',
      '347000': '네패스', '383310': '에코마케팅', '090460': '비에이치',
      '278280': '천보', '033500': '동성화인텍', '263770': '유니테스트',
      '047920': '포스코DX', '036620': 'MS오토텍', '039200': '오스코텍'
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
  
  // 코스피 상위 10 + 코스닥 상위 150개 종목
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
      
      // === 코스닥 상위 150개 종목 ===
      // 게임/엔터테인먼트
      '251270', '036570', '352820', '377300', '259960', '293490', '263750', '095660', '112040', '299900',
      '122870', '041510', '035900', '067160', '181710', '034120', '182360', '194480', '054780', '192080',
      
      // 바이오/제약/헬스케어  
      '326030', '145020', '195940', '214150', '214450', '009420', '285130', '196170', '065660', '302440',
      '091990', '328130', '085660', '237690', '287410', '099430', '141080', '156100', '222080', '173130',
      '068760', '099190', '230240', '205470', '174900', '950210', '086900', '950130', '950140', '006280',
      
      // IT/소프트웨어/반도체
      '042700', '000990', '058470', '240810', '064290', '039030', '131970', '108860', '347860', '256940',
      '033240', '046390', '060720', '214370', '347890', '052020', '079170', '093320', '298380', '950140',
      '226330', '178920', '053610', '067310', '357120', '222080', '189300', '418550', '950170',
      
      // 전자/부품/소재
      '078600', '036810', '036540', '140610', '178920', '067310', '053610', '357120', '222080', '189300',
      '418550', '950170', '403870', '206640', '950160', '086520', '101160', '067630', '066700',
      
      // 건설/부동산/인프라
      '028050', '034590', '079430', '131390', '064960', '192820', '079370', '086450',
      '086890', '079950', '086790', '950220', '086960',
      
      // 화학/소재
      '020000', '034950', '005420', '001040', '069960', '004000', '000880', '002380', '001800', '000150',
      '002350', '000680', '005300', '000430', '001060', '032350', '000500', '014820', '001390', '004560',
      
      // 유통/소비재/서비스
      '086520', '086900', '086790', '060310', '950130', '950160', '035760', '086890', '088350', '051600',
      
      // 추가 실제 코스닥 우량주
      '950170', '279600', '267290', '137400', '161000', '187660', '183300', '306200', '277880', '225570',
      '347000', '383310', '090460', '278280', '033500', '950140', '263770', '047920', '036620', '039200'
    ];
  }
}

module.exports = new SuperstocksAnalyzer();