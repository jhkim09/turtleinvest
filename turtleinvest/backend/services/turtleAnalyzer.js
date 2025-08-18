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
      for (const stock of watchlist) {
        const signal = await this.analyzeStock(stock.symbol, stock.name);
        if (signal) {
          signals.push(signal);
        }
      }
      
      // 3. 신호 저장
      await this.saveSignals(signals);
      
      console.log(`✅ 분석 완료: ${signals.length}개 신호 발견`);
      return signals;
      
    } catch (error) {
      console.error('❌ 시장 분석 실패:', error);
      throw error;
    }
  }
  
  // 개별 종목 분석
  static async analyzeStock(symbol, name) {
    try {
      // 1. 과거 20일, 55일 가격 데이터 가져오기
      const priceData = await this.getPriceData(symbol, 55);
      
      if (priceData.length < 55) {
        console.log(`⚠️ ${symbol}: 데이터 부족 (${priceData.length}일)`);
        return null;
      }
      
      const currentPrice = priceData[0].close;
      
      // 2. 터틀 지표 계산
      const indicators = this.calculateTurtleIndicators(priceData);
      
      // 3. 신호 판단
      const signal = this.generateSignal(symbol, name, currentPrice, indicators, priceData);
      
      return signal;
      
    } catch (error) {
      console.error(`❌ ${symbol} 분석 실패:`, error);
      return null;
    }
  }
  
  // 터틀 지표 계산
  static calculateTurtleIndicators(priceData) {
    // 최근 데이터가 배열의 앞쪽에 있다고 가정
    const highs = priceData.map(d => d.high);
    const lows = priceData.map(d => d.low);
    const closes = priceData.map(d => d.close);
    
    // 20일/10일 고저점
    const high20 = Math.max(...highs.slice(1, 21));  // 전일까지 20일
    const low10 = Math.min(...lows.slice(1, 11));    // 전일까지 10일
    const high55 = Math.max(...highs.slice(1, 56));  // 전일까지 55일
    const low20 = Math.min(...lows.slice(1, 21));    // 전일까지 20일
    
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
      high55,
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
  static generateSignal(symbol, name, currentPrice, indicators, priceData) {
    const signals = [];
    
    // 분석 로그 생성
    const analysisLog = {
      symbol: symbol,
      name: name,
      currentPrice: currentPrice,
      high20: indicators.high20,
      low10: indicators.low10,
      high55: indicators.high55,
      low20: indicators.low20,
      atr: indicators.atr,
      volumeRatio: indicators.volumeRatio,
      analysis: {
        system1_20d: currentPrice > indicators.high20 ? 'BREAKOUT' : 'NO_SIGNAL',
        system1_10d: currentPrice < indicators.low10 ? 'BREAKDOWN' : 'NO_SIGNAL',
        system2_55d: currentPrice > indicators.high55 ? 'BREAKOUT' : 'NO_SIGNAL',
        system2_20d: currentPrice < indicators.low20 ? 'BREAKDOWN' : 'NO_SIGNAL'
      },
      dataInfo: {
        dataLength: priceData.length,
        dataSource: priceData.length >= 55 ? 'SUFFICIENT' : 'INSUFFICIENT'
      }
    };
    
    // 터틀 분석 로그
    console.log(`📊 터틀 분석 ${symbol}: 현재가 ${currentPrice}원 (데이터 ${priceData.length}일)`);
    console.log(`   System 1 - 20일 최고가: ${indicators.high20}원 (${currentPrice > indicators.high20 ? '매수 돌파!' : '미달'})`);
    console.log(`   System 1 - 10일 최저가: ${indicators.low10}원 (${currentPrice < indicators.low10 ? '매도 신호!' : '안전'})`);
    console.log(`   System 2 - 55일 최고가: ${indicators.high55}원 (${currentPrice > indicators.high55 ? '매수 돌파!' : '미달'})`);
    
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
    
    return signals.length > 0 ? signals[0] : null; // 하나의 신호만 반환
  }
  
  // 신호 강도 계산
  static calculateSignalStrength(indicators) {
    // 거래량 비율로 신호 강도 판단
    if (indicators.volumeRatio > 2.0) return 'strong';
    if (indicators.volumeRatio > 1.5) return 'medium';
    return 'weak';
  }
  
  // 추천 액션 계산 (리스크 기반)
  static calculateRecommendedAction(action, signal, indicators) {
    // 임시 계산 - 실제로는 포트폴리오 정보 필요
    const defaultEquity = 50000000; // 5천만원 기본값
    const riskPerTrade = defaultEquity * 0.02; // 2% 리스크
    
    if (action === 'BUY') {
      // 2N 손절 기준 주문량 계산
      const dollarsPerPoint = riskPerTrade / (2 * indicators.atr);
      const recommendedQuantity = Math.floor(dollarsPerPoint / signal.currentPrice);
      const stopLossPrice = signal.currentPrice - (2 * indicators.atr);
      
      return {
        action: 'BUY',
        quantity: recommendedQuantity,
        riskAmount: riskPerTrade,
        stopLossPrice: stopLossPrice,
        reasoning: `20일 고점 돌파, 추천 리스크: ${(riskPerTrade/10000).toFixed(0)}만원`
      };
    } else {
      return {
        action: 'SELL',
        quantity: 0, // 전량 매도 (실제로는 포지션에서 가져와야 함)
        reasoning: '10일 저점 하향 돌파, 손절 또는 수익실현'
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
  
  // 종목명 반환
  static getStockName(symbol) {
    const names = {
      '005930': '삼성전자', '000660': 'SK하이닉스', '035420': 'NAVER',
      '005380': '현대차', '012330': '현대모비스', '000270': '기아',
      '105560': 'KB금융', '055550': '신한지주', '035720': '카카오',
      '051910': 'LG화학', '096770': 'SK이노베이션', '003670': '포스코홀딩스',
      '017670': 'SK텔레콤', '034730': 'SK', '323410': '카카오뱅크',
      '003550': 'LG', '086790': '하나금융지주', '068270': '셀트리온',
      '207940': '삼성바이오로직스', '028260': '삼성물산'
    };
    return names[symbol] || `종목${symbol}`;
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
}

module.exports = TurtleAnalyzer;