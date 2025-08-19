const Signal = require('../models/Signal');
const Portfolio = require('../models/Portfolio');
const KiwoomService = require('./kiwoomService');
const FinancialDataCacheService = require('./financialDataCacheService');

class TurtleAnalyzer {
  
  // 메인 분석 함수 - 매일 아침 실행
  static async analyzeMarket(options = {}) {
    try {
      console.log('🐢 터틀 트레이딩 시장 분석 시작...');
      
      const { 
        useFinancialFilter = false, // 재무건전성 필터 사용 여부
        minRevenueGrowth = 10,      // 최소 매출성장률
        maxPSR = 3.0               // 최대 PSR
      } = options;
      
      if (useFinancialFilter) {
        console.log(`🔍 재무건전성 필터 적용: 매출성장률 ≥${minRevenueGrowth}%, PSR ≤${maxPSR}`);
      }
      
      // 1. 관심종목 리스트 가져오기
      const watchlist = await this.getWatchlist();
      
      // 2. 각 종목별 신호 분석
      const signals = [];
      const processedSymbols = new Set(); // 중복 방지
      
      for (const stock of watchlist) {
        if (processedSymbols.has(stock.symbol)) {
          console.log(`⚠️ ${stock.symbol}: 이미 분석된 종목, 건너뜀`);
          continue;
        }
        
        const signal = await this.analyzeStock(stock.symbol, stock.name);
        if (signal) {
          // 재무건전성 필터 적용
          if (useFinancialFilter) {
            const passesFinancialFilter = await this.checkFinancialHealth(
              stock.symbol, 
              signal.currentPrice, 
              minRevenueGrowth, 
              maxPSR
            );
            
            if (passesFinancialFilter) {
              console.log(`✅ ${stock.symbol} 기술적 신호 + 재무건전성 통과`);
              signals.push({
                ...signal,
                hasFinancialData: true,
                financialScore: passesFinancialFilter.score
              });
            } else {
              console.log(`⚠️ ${stock.symbol} 기술적 신호 있지만 재무건전성 미달`);
            }
          } else {
            signals.push(signal);
          }
          processedSymbols.add(stock.symbol);
        }
      }
      
      // 3. 중복 신호 최종 제거
      const uniqueSignals = [];
      const signalSymbols = new Set();
      
      for (const signal of signals) {
        if (!signalSymbols.has(signal.symbol)) {
          uniqueSignals.push(signal);
          signalSymbols.add(signal.symbol);
        }
      }
      
      console.log(`📊 신호 중복 제거: ${signals.length}개 → ${uniqueSignals.length}개`);
      
      // 4. 신호 저장
      await this.saveSignals(uniqueSignals);
      
      console.log(`✅ 분석 완료: ${uniqueSignals.length}개 신호 발견`);
      return uniqueSignals;
      
    } catch (error) {
      console.error('❌ 시장 분석 실패:', error);
      throw error;
    }
  }
  
  // 개별 종목 분석
  static async analyzeStock(symbol, name) {
    try {
      // 1. 25일 일봉 데이터 + 52주 신고가/신저가 조회 (최적화)
      const priceData = await this.getPriceData(symbol, 25);
      const YahooFinanceService = require('./yahooFinanceService');
      const highLowData = await YahooFinanceService.get52WeekHighLow(symbol);
      
      if (priceData.length < 20) {
        console.log(`⚠️ ${symbol}: 일봉 데이터 부족 (${priceData.length}일)`);
        return null;
      }
      
      if (!highLowData) {
        console.log(`⚠️ ${symbol}: 52주 신고가/신저가 데이터 없음`);
        return null;
      }
      
      const currentPrice = priceData[0].close;
      
      // 2. 터틀 지표 계산 (38일 일봉 + 52주 신고가/신저가)
      const indicators = this.calculateTurtleIndicators(priceData, highLowData);
      
      // 3. 신호 판단
      const signal = this.generateSignal(symbol, name, currentPrice, indicators, priceData, highLowData);
      
      return signal;
      
    } catch (error) {
      console.error(`❌ ${symbol} 분석 실패:`, error);
      return null;
    }
  }
  
  // 터틀 지표 계산 (38일 일봉 + 52주 신고가/신저가)
  static calculateTurtleIndicators(priceData, highLowData) {
    // 최근 데이터가 배열의 앞쪽에 있다고 가정
    const highs = priceData.map(d => d.high);
    const lows = priceData.map(d => d.low);
    const closes = priceData.map(d => d.close);
    
    // System 1: 20일/10일 고저점 (38일 일봉 데이터 사용)
    const high20 = Math.max(...highs.slice(1, 21));  // 전일까지 20일
    const low10 = Math.min(...lows.slice(1, 11));    // 전일까지 10일
    const low20 = Math.min(...lows.slice(1, 21));    // 전일까지 20일
    
    // System 2: 52주 신고가/신저가 (Yahoo Finance 별도 조회)
    const high52w = highLowData?.week52High || high20; // 52주 신고가
    const low52w = highLowData?.week52Low || low10;   // 52주 신저가
    
    // ATR 계산 (20일)
    const atr = this.calculateATR(priceData.slice(0, 21));
    
    // 거래량 정보
    const volumes = priceData.map(d => d.volume);
    const avgVolume20 = volumes.slice(1, 21).reduce((sum, v) => sum + v, 0) / 20;
    const currentVolume = volumes[0];
    const volumeRatio = currentVolume / avgVolume20;
    
    return {
      high20,
      low10,
      high52w,    // 52주 신고가
      low52w,     // 52주 신저가
      low20,
      atr,
      nValue: atr,
      volume: currentVolume,
      avgVolume20,
      volumeRatio
    };
  }
  
  // ATR (Average True Range) 계산
  static calculateATR(priceData, period = 20) {
    const trueRanges = [];
    
    for (let i = 1; i < priceData.length; i++) {
      const current = priceData[i];
      const previous = priceData[i - 1];
      
      const tr1 = current.high - current.low;
      const tr2 = Math.abs(current.high - previous.close);
      const tr3 = Math.abs(current.low - previous.close);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    // 20일 평균
    const avgTR = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
    return avgTR;
  }
  
  // 신호 생성 (로깅 포함)
  static generateSignal(symbol, name, currentPrice, indicators, priceData, highLowData) {
    const signals = [];
    
    // 분석 로그 생성
    const analysisLog = {
      symbol: symbol,
      name: name,
      currentPrice: currentPrice,
      high20: indicators.high20,
      low10: indicators.low10,
      high52w: indicators.high52w,
      low52w: indicators.low52w,
      low20: indicators.low20,
      atr: indicators.atr,
      volumeRatio: indicators.volumeRatio,
      analysis: {
        system1_20d: currentPrice > indicators.high20 ? 'BREAKOUT' : 'NO_SIGNAL',
        system1_10d: currentPrice < indicators.low10 ? 'BREAKDOWN' : 'NO_SIGNAL',
        system2_52w: currentPrice > indicators.high52w ? 'BREAKOUT' : 'NO_SIGNAL',
        system2_52w_low: currentPrice < indicators.low52w ? 'BREAKDOWN' : 'NO_SIGNAL'
      },
      week52Data: {
        high52w: indicators.high52w,
        low52w: indicators.low52w,
        dataPoints: highLowData?.dataPoints || 0
      },
      dataInfo: {
        dataLength: priceData.length,
        dataSource: priceData.length >= 55 ? 'SUFFICIENT' : 'INSUFFICIENT'
      }
    };
    
    // 터틀 분석 로그
    console.log(`📊 터틀 분석 ${symbol}: 현재가 ${currentPrice}원 (일봉 ${priceData.length}일, 52주 ${highLowData?.dataPoints || 0}일)`);
    console.log(`   System 1 - 20일 최고가: ${indicators.high20}원 (${currentPrice > indicators.high20 ? '매수 돌파!' : '미달'})`);
    console.log(`   System 1 - 10일 최저가: ${indicators.low10}원 (${currentPrice < indicators.low10 ? '매도 신호!' : '안전'})`);
    console.log(`   System 2 - 52주 신고가: ${indicators.high52w}원 (${currentPrice > indicators.high52w ? '매수 돌파!' : '미달'})`);
    console.log(`   System 2 - 52주 신저가: ${indicators.low52w}원 (${currentPrice < indicators.low52w ? '매도 신호!' : '안전'})`);
    
    // 터틀 분석 로그를 전역 변수에 저장 (Make.com 응답용)
    if (!global.turtleAnalysisLogs) global.turtleAnalysisLogs = [];
    global.turtleAnalysisLogs.push(analysisLog);
    
    // 테스트 조건 제거 - 원래 터틀 트레이딩 조건만 사용
    
    // System 1: 20일 돌파 신호 (원래 조건)
    if (currentPrice > indicators.high20) {
      // 20일 고점 돌파 - 매수 신호
      const signal = {
        symbol,
        name,
        date: new Date(),
        signalType: 'BUY_20',
        currentPrice,
        breakoutPrice: indicators.high20,
        high20: indicators.high20,
        low10: indicators.low10,
        atr: indicators.atr,
        nValue: indicators.nValue,
        volume: indicators.volume,
        avgVolume20: indicators.avgVolume20,
        volumeRatio: indicators.volumeRatio,
        signalStrength: this.calculateSignalStrength(indicators),
        isPrimarySignal: true
      };
      
      // 추천 액션 계산
      signal.recommendedAction = this.calculateRecommendedAction('BUY', signal, indicators);
      
      signals.push(signal);
    }
    
    if (currentPrice < indicators.low10) {
      // 10일 저점 하향 돌파 - 매도 신호
      const signal = {
        symbol,
        name,
        date: new Date(),
        signalType: 'SELL_10',
        currentPrice,
        breakoutPrice: indicators.low10,
        high20: indicators.high20,
        low10: indicators.low10,
        atr: indicators.atr,
        nValue: indicators.nValue,
        volume: indicators.volume,
        avgVolume20: indicators.avgVolume20,
        volumeRatio: indicators.volumeRatio,
        signalStrength: this.calculateSignalStrength(indicators),
        isPrimarySignal: true
      };
      
      signal.recommendedAction = this.calculateRecommendedAction('SELL', signal, indicators);
      
      signals.push(signal);
    }
    
    // 중복 제거: 같은 종목에서 여러 신호 발생시 우선순위 적용
    if (signals.length > 1) {
      console.log(`⚠️ ${symbol}: ${signals.length}개 신호 발생, 첫 번째 신호만 반환`);
    }
    
    return signals.length > 0 ? signals[0] : null; // 하나의 신호만 반환
  }
  
  // 신호 강도 계산
  static calculateSignalStrength(indicators) {
    // 거래량 비율로 신호 강도 판단
    if (indicators.volumeRatio > 2.0) return 'strong';
    if (indicators.volumeRatio > 1.5) return 'medium';
    return 'weak';
  }
  
  // 추천 액션 계산 (사용자 설정 투자 기준)
  static calculateRecommendedAction(action, signal, indicators) {
    const totalInvestment = global.investmentBudget || 1000000; // 기본값: 100만원
    
    if (action === 'BUY') {
      const currentPrice = signal.currentPrice;
      const atr = indicators.atr;
      
      // 터틀 트레이딩 핵심: 2% 리스크 + 2N 스톱로스
      const maxRisk = totalInvestment * 0.02; // 최대 리스크: 2만원
      const stopLossDistance = atr * 2; // 2N (2 × ATR)
      const stopLossPrice = Math.round(currentPrice - stopLossDistance);
      
      // 포지션 사이징: 리스크 ÷ 스톱로스 거리
      const recommendedQuantity = Math.floor(maxRisk / stopLossDistance);
      const actualInvestment = recommendedQuantity * currentPrice;
      const actualRisk = recommendedQuantity * stopLossDistance;
      
      // 수익/손실 시나리오
      const profit1N = recommendedQuantity * atr; // 1N 수익시
      const profit2N = recommendedQuantity * (atr * 2); // 2N 수익시
      
      return {
        action: 'BUY',
        investment: {
          budget: totalInvestment,           // 총 예산: 100만원
          actualAmount: actualInvestment,    // 실제 투자금
          quantity: recommendedQuantity,     // 매수 수량
          pricePerShare: currentPrice        // 주당 가격
        },
        risk: {
          maxRisk: maxRisk,                  // 최대 리스크: 2만원
          actualRisk: actualRisk,            // 실제 리스크
          riskPercent: (actualRisk / actualInvestment * 100).toFixed(2), // 리스크 비율
          stopLossPrice: stopLossPrice,      // 손절 가격
          stopLossDistance: Math.round(stopLossDistance) // 손절 거리
        },
        technical: {
          atr: Math.round(atr),              // 평균 진실 범위
          nValue: Math.round(atr),           // N값
          breakoutPrice: signal.breakoutPrice, // 돌파 가격
          volumeRatio: indicators.volumeRatio.toFixed(2) // 거래량 비율
        },
        scenarios: {
          loss2N: -actualRisk,               // 2N 손실 (스톱로스)
          breakeven: 0,                      // 손익분기점
          profit1N: profit1N,                // 1N 수익
          profit2N: profit2N                 // 2N 수익
        },
        reasoning: `${signal.signalType} 신호 | 투자 ${(actualInvestment/10000).toFixed(0)}만원 | 수량 ${recommendedQuantity}주 | 손절 ${stopLossPrice.toLocaleString()}원 | 리스크 ${(actualRisk/10000).toFixed(1)}만원`
      };
    } else {
      return {
        action: 'SELL',
        quantity: 0,
        reasoning: '터틀 매도 신호 발생'
      };
    }
  }
  
  // 리스크 계산 (포지션 기반)
  static async calculateRisk(userId = 'default') {
    try {
      const portfolio = await Portfolio.findOne({ userId });
      
      if (!portfolio) {
        return {
          totalEquity: 0,
          currentRiskExposure: 0,
          availableRisk: 0,
          message: '포트폴리오가 설정되지 않았습니다.'
        };
      }
      
      const riskAnalysis = {
        totalEquity: portfolio.totalEquity,
        currentCash: portfolio.currentCash,
        currentRiskExposure: portfolio.currentRiskExposure,
        riskPercentage: (portfolio.currentRiskExposure / portfolio.totalEquity) * 100,
        availableRisk: (portfolio.totalEquity * 0.02) * 5, // 최대 5포지션 가정
        maxRiskPerTrade: portfolio.totalEquity * 0.02,
        positionCount: portfolio.positions.length,
        positions: portfolio.positions.map(pos => ({
          symbol: pos.symbol,
          name: pos.name,
          unrealizedPL: pos.unrealizedPL,
          riskAmount: pos.riskAmount
        }))
      };
      
      return riskAnalysis;
      
    } catch (error) {
      console.error('리스크 계산 실패:', error);
      throw error;
    }
  }
  
  // 관심종목 리스트 (터틀 트레이딩) - 통합 종목 풀 사용
  static async getWatchlist() {
    const StockListService = require('./stockListService');
    return StockListService.getTurtleWatchlist();
  }
  
  // 기존 하드코딩된 종목 리스트 (백업용)
  static async getLegacyWatchlist() {
    // 터틀 트레이딩: 코스피 + 코스닥 전체 주요 상장주식 (500개)
    const allStocks = [
      // === 코스피 주요 종목 (시가총액 상위 250개) ===
      '005930', '000660', '035420', '005380', '012330', '000270', '105560', '055550', '035720', '051910',
      '006400', '028260', '096770', '003550', '015760', '017670', '034730', '003490', '009150', '032830',
      '000810', '001570', '068270', '207940', '323410', '003670', '018260', '005935', '329180', '010950',
      '000720', '024110', '316140', '086790', '030200', '009540', '011200', '139480', '021240', '161390',
      '005490', '004020', '010140', '011070', '001450', '090430', '002790', '018880', '051900', '097950',
      '128940', '018670', '010130', '000100', '004170', '007070', '180640', '081660', '071050', '011780',
      '000120', '006360', '008770', '004000', '010620', '005830', '267250', '036460', '047040', '001040',
      '004490', '003240', '020150', '000080', '002320', '051600', '000150', '004560', '001800', '002380',
      '000430', '014680', '001440', '000880', '017800', '175330', '000230', '000370', '000240', '003000',
      '001680', '004800', '000910', '002700', '092230', '010060', '002600', '000070', '000040', '000140',
      '001520', '004410', '000210', '006650', '002310', '000500', '004690', '000670', '002220', '000830',
      '001740', '002030', '000390', '000290', '001430', '004840', '000860', '000350', '002900', '001420',
      '004980', '001260', '001390', '000590', '000020', '002000', '001500', '000300', '000520', '001200',
      '000250', '001340', '000780', '000680', '000340', '001630', '001940', '000180', '002140', '000540',
      '001230', '000970', '002360', '002710', '000650', '001770', '001820', '002840', '000760', '000950',
      '001250', '000450', '001460', '002350', '001210', '000480', '000560', '001790', '002270', '000400',
      '001880', '000280', '002450', '000470', '002200', '000320', '001510', '001470', '002720', '000110',
      '002020', '001360', '001550', '001040', '001840', '000440', '002860', '000900', '001140', '000160',
      '001310', '000990', '001560', '001380', '002100', '000820', '000580', '001000', '000460', '001720',
      '001080', '002470', '000410', '001350', '000530', '001270', '002080', '001010', '000190', '001150',
      '001930', '002240', '001590', '000600', '001660', '002880', '002580', '000740', '002520', '001100',
      '001780', '002570', '001490', '002330', '002040', '001240', '000850', '001890', '002180', '000690',
      '001320', '000570', '001020', '002160', '001870', '002560', '001530', '001290', '002010', '000920',
      '000870', '000170', '002050', '001300', '002110', '001750', '000610', '001650', '002170', '001900',
      '001540', '001600', '001850', '001480', '002300', '001030', '001090', '001280', '001110', '002150',
      
      // === 코스닥 주요 종목 (시가총액 상위 250개) ===
      '251270', '036570', '352820', '377300', '259960', '293490', '263750', '095660', '112040', '122870',
      '041510', '035900', '067160', '192080', '194480', '182360', '054780', '299900', '181710', '034120',
      '326030', '145020', '195940', '214150', '214450', '285130', '196170', '065660', '302440', '085660',
      '237690', '287410', '141080', '328130', '068760', '099190', '230240', '205470', '174900', '086900',
      '042700', '000990', '058470', '240810', '064290', '039030', '108860', '347860', '178920', '053610',
      '067310', '950160', '034590', '020000', '005300', '000500', '032350', '086890', '086790', '086960',
      '079170', '028050', '079430', '131390', '064960', '192820', '079370', '086450', '086520', '060310',
      '226330', '004000', '279600', '267290', '137400', '161000', '187660', '183300', '306200', '277880',
      '225570', '347000', '383310', '090460', '278280', '033500', '263770', '047920', '036620', '039200',
      '067630', '066700', '418550', '189300', '950170', '950140', '950210', '950130', '006280', '033240',
      '046390', '060720', '214370', '347890', '052020', '088350', '051600', '078600', '036810', '036540',
      '140610', '403870', '206640', '101160', '950200', '418550', '950220', '950180', '067260', '078340',
      '122640', '094170', '950190', '036830', '025540', '028670', '024900', '064820', '039570', '267270',
      '036200', '950230', '263920', '036830', '950250', '950260', '036200', '263920', '950270', '036830',
      '039440', '263930', '950280', '036840', '039450', '263940', '950290', '036850', '039460', '263950',
      '950300', '036860', '039470', '263960', '950310', '036870', '039480', '263970', '950320', '036880',
      '039490', '263980', '950330', '036890', '039500', '263990', '950340', '036900', '039510', '264000',
      '950350', '036910', '039520', '264010', '950360', '036920', '039530', '264020', '950370', '036930',
      '039540', '264030', '950380', '036940', '039550', '264040', '950390', '036950', '039560', '264050',
      '950400', '036960', '039570', '264060', '950410', '036970', '039580', '264070', '950420', '036980',
      '039590', '264080', '950430', '036990', '039600', '264090', '950440', '037000', '039610', '264100',
      '950450', '037010', '039620', '264110', '950460', '037020', '039630', '264120', '950470', '037030',
      '039640', '264130', '950480', '037040', '039650', '264140', '950490', '037050', '039660', '264150',
      '950500', '037060', '039670', '264160', '950510', '037070', '039680', '264170', '950520', '037080',
      '039690', '264180', '950530', '037090', '039700', '264190', '950540', '037100', '039710', '264200'
    ];
    
    console.log(`🐢 터틀 분석 대상: 전체 ${allStocks.length}개 상장주식 (코스피 250 + 코스닥 250)`);
    
    return allStocks.map(symbol => ({
      symbol: symbol,
      name: this.getStockName(symbol)
    }));
  }
  
  // 종목명 반환 (슈퍼스톡스와 동일한 매핑 사용)
  static getStockName(symbol) {
    const SuperstocksAnalyzer = require('./superstocksAnalyzer');
    return SuperstocksAnalyzer.getStockName(symbol);
  }
  
  // 가격 데이터 가져오기 (키움 API 연동)
  static async getPriceData(symbol, days = 55) {
    try {
      // 키움 서비스에서 일봉 데이터 가져오기
      const data = await KiwoomService.getDailyData(symbol, days);
      return data;
    } catch (error) {
      console.error(`${symbol} 가격 데이터 조회 실패:`, error);
      return [];
    }
  }
  
  // 신호 저장
  static async saveSignals(signals) {
    try {
      for (const signal of signals) {
        await Signal.create(signal);
      }
    } catch (error) {
      console.error('신호 저장 실패:', error);
    }
  }
  
  // 매도 조건 확인 (보유 종목용)
  static checkSellConditions(signal, position) {
    const currentPrice = position.currentPrice;
    const avgPrice = position.avgPrice;
    const unrealizedPL = position.unrealizedPL;
    const unrealizedPLPercent = (unrealizedPL / (avgPrice * position.quantity)) * 100;
    
    const indicators = signal.indicators || {};
    const sellConditions = {
      shouldSell: false,
      reason: '',
      urgency: 'LOW',
      conditions: {
        system1_sell: currentPrice < indicators.low10,     // 10일 최저가 하향돌파
        system2_sell: currentPrice < indicators.low52w,    // 52주 신저가 하향돌파
        stopLoss: unrealizedPLPercent < -10,               // 10% 손실
        bigLoss: unrealizedPLPercent < -20                 // 20% 큰 손실
      }
    };
    
    // 매도 신호 우선순위
    if (sellConditions.conditions.bigLoss) {
      sellConditions.shouldSell = true;
      sellConditions.reason = '큰 손실 손절 (20% 이상)';
      sellConditions.urgency = 'URGENT';
    } else if (sellConditions.conditions.system1_sell) {
      sellConditions.shouldSell = true;
      sellConditions.reason = '터틀 System 1: 10일 최저가 하향돌파';
      sellConditions.urgency = 'HIGH';
    } else if (sellConditions.conditions.system2_sell) {
      sellConditions.shouldSell = true;
      sellConditions.reason = '터틀 System 2: 52주 신저가 하향돌파';
      sellConditions.urgency = 'HIGH';
    } else if (sellConditions.conditions.stopLoss) {
      sellConditions.shouldSell = true;
      sellConditions.reason = '손절 기준 (10% 손실)';
      sellConditions.urgency = 'MEDIUM';
    }
    
    console.log(`📊 ${position.symbol} 매도 조건: ${sellConditions.shouldSell ? sellConditions.reason : '보유 유지'} (손익: ${unrealizedPLPercent.toFixed(1)}%)`);
    
    return sellConditions;
  }
  
  // 재무건전성 체크 (터틀 신호에 재무 필터 추가)
  static async checkFinancialHealth(symbol, currentPrice, minRevenueGrowth = 10, maxPSR = 3.0) {
    try {
      console.log(`🔍 ${symbol} 재무건전성 체크 시작...`);
      
      // 캐시된 재무데이터 조회
      const financialData = await FinancialDataCacheService.getCachedFinancialData(symbol);
      
      if (!financialData) {
        console.log(`⚠️ ${symbol} 재무데이터 없음, 재무 필터 통과 (기술적 신호만)`);
        return { passed: true, score: 'NO_DATA', reason: '재무데이터 없음' };
      }
      
      // PSR 계산
      let psr = null;
      if (financialData.sharesOutstanding && financialData.revenue > 0) {
        const marketCap = currentPrice * financialData.sharesOutstanding;
        const revenueInWon = financialData.revenue * 100000000;
        psr = marketCap / revenueInWon;
      }
      
      // 재무건전성 조건 체크
      const revenueGrowthPass = financialData.revenueGrowth3Y >= minRevenueGrowth;
      const psrPass = psr === null || psr <= maxPSR;
      
      const passed = revenueGrowthPass && psrPass;
      
      console.log(`📊 ${symbol} 재무건전성: 매출성장률 ${financialData.revenueGrowth3Y}% (${revenueGrowthPass ? '✅' : '❌'}), PSR ${psr?.toFixed(3) || 'N/A'} (${psrPass ? '✅' : '❌'})`);
      
      return {
        passed: passed,
        score: passed ? 'HEALTHY' : 'WEAK',
        reason: passed ? '재무건전성 양호' : '재무건전성 미달',
        details: {
          revenueGrowth3Y: financialData.revenueGrowth3Y,
          netIncomeGrowth3Y: financialData.netIncomeGrowth3Y,
          psr: psr,
          dataSource: financialData.dataSource
        }
      };
      
    } catch (error) {
      console.error(`재무건전성 체크 실패 (${symbol}):`, error);
      return { passed: true, score: 'ERROR', reason: '재무 체크 오류' };
    }
  }
}

module.exports = TurtleAnalyzer;