const Signal = require('../models/Signal');
const Portfolio = require('../models/Portfolio');
const KiwoomService = require('./kiwoomService');

class TurtleAnalyzer {
  
  // 메인 분석 함수 - 매일 아침 실행
  static async analyzeMarket() {
    try {
      console.log('🐢 터틀 트레이딩 시장 분석 시작...');
      
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
          signals.push(signal);
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
  
  // 추천 액션 계산 (100만원 투자 기준)
  static calculateRecommendedAction(action, signal, indicators) {
    const totalInvestment = 1000000; // 100만원 고정 투자금
    
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
  
  // 관심종목 리스트 가져오기 (임시)
  static async getWatchlist() {
    // 슈퍼스톡스와 동일한 리스트 사용 (코스피 상위 10 + 코스닥 주요 종목)
    const SuperstocksAnalyzer = require('./superstocksAnalyzer');
    const stockList = SuperstocksAnalyzer.getDefaultStockList();
    
    return stockList.map(symbol => ({
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
}

module.exports = TurtleAnalyzer;