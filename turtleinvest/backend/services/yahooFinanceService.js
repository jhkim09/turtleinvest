const axios = require('axios');

class YahooFinanceService {
  
  constructor() {
    this.baseURL = 'https://query1.finance.yahoo.com';
    this.cache = new Map(); // 캐시로 API 호출 최소화
    this.rateLimitDelay = 100; // API 호출 간격 (밀리초)
  }
  
  // 한국 주식 코드 변환 (005930 → 005930.KS)
  convertToYahooSymbol(koreanSymbol) {
    return `${koreanSymbol}.KS`;
  }
  
  // 일봉 차트 데이터 조회
  async getDailyChartData(symbol, days = 60) {
    try {
      const yahooSymbol = this.convertToYahooSymbol(symbol);
      const cacheKey = `chart_${yahooSymbol}_${days}`;
      
      // 캐시 확인 (5분간 유효)
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
          return cached.data;
        }
      }
      
      // 기간 설정 (현재부터 과거로)
      const endDate = Math.floor(Date.now() / 1000);
      const startDate = endDate - (days * 24 * 60 * 60); // days일 전
      
      const url = `${this.baseURL}/v8/finance/chart/${yahooSymbol}`;
      
      const response = await axios.get(url, {
        params: {
          period1: startDate,
          period2: endDate,
          interval: '1d',
          includePrePost: false,
          events: 'div,splits'
        },
        timeout: 10000 // 10초 타임아웃
      });
      
      if (response.data.chart?.result?.[0]) {
        const result = response.data.chart.result[0];
        const timestamps = result.timestamp || [];
        const quotes = result.indicators?.quote?.[0] || {};
        
        const dailyData = timestamps.map((timestamp, index) => ({
          date: new Date(timestamp * 1000).toISOString().split('T')[0],
          open: Math.round(quotes.open?.[index] || 0),
          high: Math.round(quotes.high?.[index] || 0),
          low: Math.round(quotes.low?.[index] || 0),
          close: Math.round(quotes.close?.[index] || 0),
          volume: quotes.volume?.[index] || 0
        })).filter(item => item.close > 0); // 유효한 데이터만
        
        // 캐시 저장
        this.cache.set(cacheKey, {
          data: dailyData,
          timestamp: Date.now()
        });
        
        console.log(`✅ Yahoo Finance: ${symbol} 일봉 데이터 ${dailyData.length}개 조회 성공`);
        return dailyData;
        
      } else {
        throw new Error('차트 데이터가 없습니다');
      }
      
    } catch (error) {
      console.error(`Yahoo Finance 일봉 조회 실패 (${symbol}):`, error.message);
      return null;
    }
  }
  
  // 현재가 조회
  async getCurrentPrice(symbol) {
    try {
      const yahooSymbol = this.convertToYahooSymbol(symbol);
      const cacheKey = `price_${yahooSymbol}`;
      
      // 캐시 확인 (1분간 유효)
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 60 * 1000) {
          return cached.data;
        }
      }
      
      const url = `${this.baseURL}/v8/finance/chart/${yahooSymbol}`;
      
      const response = await axios.get(url, {
        params: {
          range: '1d',
          interval: '1m'
        },
        timeout: 5000
      });
      
      if (response.data.chart?.result?.[0]) {
        const result = response.data.chart.result[0];
        const currentPrice = result.meta?.regularMarketPrice || result.meta?.previousClose;
        
        if (currentPrice) {
          const price = Math.round(currentPrice);
          
          // 캐시 저장
          this.cache.set(cacheKey, {
            data: price,
            timestamp: Date.now()
          });
          
          return price;
        }
      }
      
      throw new Error('현재가 데이터가 없습니다');
      
    } catch (error) {
      console.error(`Yahoo Finance 현재가 조회 실패 (${symbol}):`, error.message);
      return null;
    }
  }
  
  // 여러 종목 배치 조회 (성능 최적화)
  async getBatchDailyData(symbols, days = 60) {
    const batchSize = 5; // 동시 요청 수 제한
    const results = {};
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (symbol) => {
        const data = await this.getDailyChartData(symbol, days);
        return { symbol, data };
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(({ symbol, data }) => {
        results[symbol] = data;
      });
      
      // Rate limiting
      if (i + batchSize < symbols.length) {
        await this.delay(this.rateLimitDelay);
      }
    }
    
    return results;
  }
  
  // Rate limit을 위한 지연 함수
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // 캐시 초기화
  clearCache() {
    this.cache.clear();
  }
  
  // 연결 테스트
  async testConnection(symbol = '005930') {
    try {
      const price = await this.getCurrentPrice(symbol);
      const chartData = await this.getDailyChartData(symbol, 5);
      
      return {
        success: true,
        symbol: symbol,
        currentPrice: price,
        chartDataLength: chartData?.length || 0,
        message: 'Yahoo Finance 연결 성공'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new YahooFinanceService();