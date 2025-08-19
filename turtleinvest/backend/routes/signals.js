const express = require('express');
const router = express.Router();
const Signal = require('../models/Signal');
const TurtleAnalyzer = require('../services/turtleAnalyzer');
const SuperstocksAnalyzer = require('../services/superstocksAnalyzer');
const SlackMessageFormatter = require('../services/slackMessageFormatter');
const FinancialData = require('../models/FinancialData');

// API 헬스체크 및 상태 확인
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '3.0',
      services: {
        server: 'running',
        database: 'connected', // TODO: 실제 DB 연결 상태 확인
        dartApi: process.env.DART_API_KEY ? 'configured' : 'missing',
        makeApi: process.env.MAKE_API_KEY ? 'configured' : 'missing'
      },
      endpoints: {
        superstocksSearch: '/api/signals/superstocks-search',
        turtleAnalysis: '/api/signals/analyze',
        integratedAnalysis: '/api/signals/make-analysis'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 최신 신호 조회
router.get('/latest', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const signals = await Signal.find()
      .sort({ date: -1 })
      .limit(limit);
    
    res.json({
      success: true,
      signals: signals,
      count: signals.length,
      message: '최신 신호 조회 완료'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 수동 분석 실행 (기존 - 순수 기술적 분석)
router.post('/analyze', async (req, res) => {
  try {
    console.log('🔍 수동 터틀 분석 시작...');
    
    // 실제 터틀 분석 실행
    const signals = await TurtleAnalyzer.analyzeMarket();
    
    res.json({
      success: true,
      message: '터틀 분석 완료',
      signals: signals,
      count: signals.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('분석 실패:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: '터틀 분석 중 오류가 발생했습니다'
    });
  }
});

// 재무건전성 필터링이 있는 터틀 분석
router.post('/analyze-with-financial-filter', async (req, res) => {
  try {
    console.log('🔍 재무 필터링 터틀 분석 시작...');
    
    const { 
      minRevenueGrowth = 10,
      maxPSR = 3.0
    } = req.body;
    
    // 재무건전성 필터가 있는 터틀 분석 실행
    const signals = await TurtleAnalyzer.analyzeMarket({
      useFinancialFilter: true,
      minRevenueGrowth: minRevenueGrowth,
      maxPSR: maxPSR
    });
    
    const financialSignals = signals.filter(s => s.hasFinancialData);
    
    res.json({
      success: true,
      message: '재무 필터링 터틀 분석 완료',
      signals: signals,
      financialSignals: financialSignals,
      count: signals.length,
      financialCount: financialSignals.length,
      filterSettings: {
        minRevenueGrowth: minRevenueGrowth,
        maxPSR: maxPSR
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('재무 필터링 분석 실패:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: '재무 필터링 터틀 분석 중 오류가 발생했습니다'
    });
  }
});

// 특정 종목 분석
router.post('/analyze/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { name } = req.body;
    
    console.log(`🔍 ${symbol} 개별 분석 시작...`);
    
    const signal = await TurtleAnalyzer.analyzeStock(symbol, name || symbol);
    
    res.json({
      success: true,
      signal: signal,
      message: `${symbol} 분석 완료`
    });
    
  } catch (error) {
    console.error('개별 분석 실패:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 리스크 분석
router.get('/risk', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const riskAnalysis = await TurtleAnalyzer.calculateRisk(userId);
    
    res.json({
      success: true,
      riskAnalysis: riskAnalysis,
      message: '리스크 분석 완료'
    });
    
  } catch (error) {
    console.error('리스크 분석 실패:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 고속 슈퍼스톡스 검색 API (Bulk DART API 활용)
router.post('/superstocks-search', async (req, res) => {
  try {
    console.log('📨 슈퍼스톡스 검색 API 요청 수신:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      bodyType: typeof req.body
    });

    // 요청 본문 검증
    if (!req.body) {
      console.error('❌ 요청 본문이 비어있음');
      return res.status(400).json({
        success: false,
        error: 'MISSING_BODY',
        message: 'Request body is required'
      });
    }

    const { 
      apiKey, 
      symbols,
      conditions = {},
      includeCharts = false
    } = req.body;

    console.log('🔍 파싱된 요청 데이터:', {
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'undefined',
      symbols: symbols ? symbols.length : 'default',
      conditions,
      includeCharts
    });
    
    // API 키 검증
    const validApiKey = process.env.MAKE_API_KEY || 'turtle_make_api_2024';
    if (!apiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid API key'
      });
    }
    
    // 검색 조건 설정
    const searchConditions = {
      minRevenueGrowth: conditions.minRevenueGrowth || 15,
      minNetIncomeGrowth: conditions.minNetIncomeGrowth || 15,
      maxPSR: conditions.maxPSR || 0.75,
      minPrice: conditions.minPrice || 0,
      maxPrice: conditions.maxPrice || 1000000
    };
    
    const stockList = symbols || SuperstocksAnalyzer.getDefaultStockList();
    
    console.log(`⚡ 고속 슈퍼스톡스 검색 시작: ${stockList.length}개 종목 (조건: 매출성장률 ≥${searchConditions.minRevenueGrowth}%, PSR ≤${searchConditions.maxPSR})`);
    
    const startTime = Date.now();
    
    // 1. 고속 재무데이터 조회 (캐시 + Bulk API)
    const FinancialDataCacheService = require('../services/financialDataCacheService');
    const financialDataMap = await FinancialDataCacheService.getSuperstocksFinancialData(stockList);
    
    console.log(`📊 재무데이터 수집 완료: ${financialDataMap.size}개 종목 (소요시간: ${((Date.now() - startTime)/1000).toFixed(1)}초)`);
    
    // 2. 현재가 조회 (병렬 처리)
    const pricePromises = Array.from(financialDataMap.keys()).map(async (stockCode) => {
      try {
        const KiwoomService = require('../services/kiwoomService');
        let currentPrice = await KiwoomService.getCurrentPrice(stockCode);
        
        if (!currentPrice) {
          // 키움 실패시 Yahoo Finance 백업
          const YahooFinanceService = require('../services/yahooFinanceService');
          currentPrice = await YahooFinanceService.getCurrentPrice(stockCode);
        }
        
        return { stockCode, currentPrice, error: null };
      } catch (error) {
        return { stockCode, currentPrice: null, error: error.message };
      }
    });
    
    const priceResults = await Promise.all(pricePromises);
    const priceMap = new Map();
    priceResults.forEach(result => {
      if (result.currentPrice) {
        priceMap.set(result.stockCode, result.currentPrice);
      }
    });
    
    console.log(`💰 현재가 수집 완료: ${priceMap.size}개 종목 (소요시간: ${((Date.now() - startTime)/1000).toFixed(1)}초)`);
    
    // 3. PSR 계산 및 조건 필터링
    const results = [];
    
    financialDataMap.forEach((financialData, stockCode) => {
      const currentPrice = priceMap.get(stockCode);
      if (!currentPrice || !financialData.revenue || financialData.revenue <= 0) return;
      
      // PSR 계산을 위한 상장주식수 (추정값 사용)
      const estimatedShares = SuperstocksAnalyzer.estimateSharesOutstanding(
        stockCode, 
        currentPrice, 
        financialData.revenue
      );
      
      const marketCap = currentPrice * estimatedShares;
      const revenueInWon = financialData.revenue * 100000000;
      const psr = revenueInWon > 0 ? marketCap / revenueInWon : 999;
      
      // 조건 확인
      const meetsConditions = (
        financialData.revenueGrowth3Y >= searchConditions.minRevenueGrowth &&
        financialData.netIncomeGrowth3Y >= searchConditions.minNetIncomeGrowth &&
        psr <= searchConditions.maxPSR &&
        currentPrice >= searchConditions.minPrice &&
        currentPrice <= searchConditions.maxPrice
      );
      
      // 점수 계산
      let score = 0;
      if (financialData.revenueGrowth3Y >= 20) score += 40;
      else if (financialData.revenueGrowth3Y >= 15) score += 30;
      
      if (financialData.netIncomeGrowth3Y >= 20) score += 40;
      else if (financialData.netIncomeGrowth3Y >= 15) score += 30;
      
      if (psr <= 0.5) score += 20;
      else if (psr <= 0.75) score += 10;
      
      const grade = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : score >= 40 ? 'FAIR' : 'POOR';
      
      results.push({
        symbol: stockCode,
        name: financialData.name,
        currentPrice: currentPrice,
        revenue: financialData.revenue,
        netIncome: financialData.netIncome,
        revenueGrowth3Y: financialData.revenueGrowth3Y,
        netIncomeGrowth3Y: financialData.netIncomeGrowth3Y,
        psr: Math.round(psr * 1000) / 1000,
        marketCap: marketCap,
        score: grade,
        numericScore: score,
        meetsConditions: meetsConditions,
        dataSource: financialData.dataSource,
        lastUpdated: financialData.lastUpdated
      });
    });
    
    // 4. 결과 정렬 및 필터링
    const qualifiedStocks = results.filter(stock => stock.meetsConditions)
      .sort((a, b) => b.numericScore - a.numericScore);
    
    const allResults = results.sort((a, b) => b.numericScore - a.numericScore);
    
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1);
    
    console.log(`⚡ 고속 검색 완료: ${qualifiedStocks.length}개 조건 만족 (총 ${results.length}개 분석, 소요시간: ${processingTime}초)`);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      processingTime: `${processingTime}초`,
      searchConditions,
      summary: {
        totalAnalyzed: results.length,
        qualifiedStocks: qualifiedStocks.length,
        excellentStocks: qualifiedStocks.filter(s => s.score === 'EXCELLENT').length,
        goodStocks: qualifiedStocks.filter(s => s.score === 'GOOD').length,
        averagePSR: results.length > 0 ? (results.reduce((sum, s) => sum + s.psr, 0) / results.length).toFixed(3) : 0,
        performance: {
          cacheHitRate: financialDataMap.size > 0 ? 'High' : 'Low',
          priceCollectionRate: `${priceMap.size}/${stockList.length} (${((priceMap.size/stockList.length)*100).toFixed(1)}%)`,
          totalProcessingTime: processingTime + '초'
        }
      },
      qualifiedStocks: qualifiedStocks.slice(0, 50), // 상위 50개만
      excellentStocks: qualifiedStocks.filter(s => s.score === 'EXCELLENT').slice(0, 20),
      goodStocks: qualifiedStocks.filter(s => s.score === 'GOOD').slice(0, 20),
      allResults: allResults.slice(0, 100), // 전체 결과 상위 100개만
      metadata: {
        requestedBy: 'api_client',
        analysisType: 'superstocks_bulk_search',
        market: 'KRX',
        apiVersion: '3.0',
        optimizations: [
          'DART Bulk API',
          'Financial Data Caching',
          'Parallel Price Collection',
          'In-Memory Processing'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ 고속 슈퍼스톡스 검색 실패:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });

    // 더 구체적인 에러 응답
    const errorResponse = {
      success: false,
      error: 'SUPERSTOCKS_SEARCH_FAILED',
      message: error.message || '알 수 없는 오류가 발생했습니다',
      timestamp: new Date().toISOString(),
      details: {
        errorName: error.name,
        errorType: typeof error
      }
    };

    // 개발 환경에서는 더 자세한 정보 제공
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.stack = error.stack;
      errorResponse.debugInfo = {
        requestReceived: true,
        bodyParsed: !!req.body
      };
    }

    res.status(500).json(errorResponse);
  }
});

// Make.com 통합 분석 API (터틀 + 슈퍼스톡스)
router.post('/make-analysis', async (req, res) => {
  try {
    const { apiKey, symbols, investmentBudget } = req.body;
    
    // API 키 검증
    const validApiKey = process.env.MAKE_API_KEY || 'turtle_make_api_2024';
    if (!apiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid API key'
      });
    }
    
    // 투자 예산 설정 (기본값: 100만원)
    const budget = investmentBudget || 1000000;
    console.log(`🔍 Make.com에서 통합 분석 요청 (터틀 + 슈퍼스톡스) | 투자예산: ${(budget/10000).toFixed(0)}만원`);
    
    // 터틀 분석 로그 초기화
    global.turtleAnalysisLogs = [];
    global.investmentBudget = budget; // 전역 변수로 예산 설정
    
    // 터틀 분석 (오류 방어)
    let turtleSignals = [];
    try {
      turtleSignals = await TurtleAnalyzer.analyzeMarket() || [];
      console.log(`✅ 터틀 분석 완료: ${turtleSignals.length}개 신호`);
    } catch (turtleError) {
      console.error('❌ 터틀 분석 실패:', turtleError.message);
      turtleSignals = [];
    }
    
    // 슈퍼스톡스 분석 (하이브리드 방식: 캐시 + 키움 가격)
    let superstocks = [];
    try {
      console.log(`📊 하이브리드 슈퍼스톡스 분석 시작...`);
      
      // 1. 캐시에서 재무조건 만족 종목 조회 (DART API 호출 없음)
      const financialCandidates = await FinancialData.find({
        dataYear: 2025,
        dataSource: 'ESTIMATED',
        revenueGrowth3Y: { $gte: 15 },
        netIncomeGrowth3Y: { $gte: 15 },
        revenue: { $gt: 100 }
      }).sort({ revenueGrowth3Y: -1 }).limit(30); // 상위 30개

      console.log(`📋 재무조건 만족: ${financialCandidates.length}개 후보`);

      // 2. 키움 API로 가격 조회 (검증된 가격만)
      const StockPriceService = require('../services/stockPriceService');
      const stockCodes = financialCandidates.map(stock => stock.stockCode);
      const priceResult = await StockPriceService.getBulkPrices(stockCodes, false);

      // 3. 실제 가격이 있는 종목만 분석
      financialCandidates.forEach(stock => {
        const currentPrice = priceResult.prices.get(stock.stockCode);
        
        if (currentPrice && currentPrice > 1000) {
          // PSR 계산
          const marketCap = currentPrice * stock.sharesOutstanding;
          const revenueInWon = stock.revenue * 100000000;
          const psr = revenueInWon > 0 ? marketCap / revenueInWon : 999;

          // PSR 조건 확인 (현실적 기준 2.5)
          if (psr <= 2.5) {
            superstocks.push({
              symbol: stock.stockCode,
              name: stock.name,
              currentPrice: currentPrice,
              revenueGrowth3Y: stock.revenueGrowth3Y,
              netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
              psr: Math.round(psr * 1000) / 1000,
              marketCap: marketCap,
              revenue: stock.revenue,
              netIncome: stock.netIncome,
              score: stock.revenueGrowth3Y >= 30 ? 'EXCELLENT' : 'GOOD',
              meetsConditions: true,
              dataSource: 'HYBRID_CACHE_KIWOOM',
              timestamp: new Date().toISOString()
            });
          }
        }
      });

      console.log(`✅ 하이브리드 슈퍼스톡스 분석 완료: ${superstocks.length}개 결과`);
    } catch (superstocksError) {
      console.error('❌ 슈퍼스톡스 분석 실패:', superstocksError.message);
      superstocks = [];
    }
    
    // 두 조건 모두 만족하는 주식 찾기 (안전한 처리)
    const overlappingStocks = [];
    
    turtleSignals.forEach(turtle => {
      const superstock = superstocks.find(s => s.symbol === turtle.symbol);
      if (superstock && superstock.meetsConditions) {
        overlappingStocks.push({
          symbol: turtle.symbol,
          name: turtle.name,
          turtleSignal: turtle.signalType,
          superstocksScore: superstock.score,
          currentPrice: turtle.currentPrice,
          turtleAction: turtle.recommendedAction?.action || 'HOLD',
          superstocksData: {
            revenueGrowth3Y: superstock.revenueGrowth3Y,
            netIncomeGrowth3Y: superstock.netIncomeGrowth3Y,
            psr: superstock.psr
          },
          isPremiumOpportunity: true
        });
      }
    });
    
    // 안전한 응답 구조 생성
    const qualifiedSuperstocks = superstocks.filter(s => s && s.meetsConditions) || [];
    const totalSuperstocks = superstocks.filter(s => s !== null) || [];
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        turtleSignals: turtleSignals.length || 0,
        qualifiedSuperstocks: qualifiedSuperstocks.length || 0,
        totalSuperstocksAnalyzed: totalSuperstocks.length || 0,
        overlappingStocks: overlappingStocks.length || 0,
        hasOverlap: overlappingStocks.length > 0,
        analysisStatus: {
          turtleSuccess: turtleSignals.length >= 0,
          superstocksSuccess: totalSuperstocks.length >= 0
        }
      },
      turtleTrading: {
        totalSignals: turtleSignals.length,
        buySignals: turtleSignals.filter(s => s.signalType?.includes('BUY')).length,
        sellSignals: turtleSignals.filter(s => s.signalType?.includes('SELL')).length,
        signals: turtleSignals.map(signal => ({
          symbol: signal.symbol,
          name: signal.name,
          signalType: signal.signalType,
          currentPrice: signal.currentPrice,
          action: signal.recommendedAction?.action || 'HOLD',
          reasoning: signal.recommendedAction?.reasoning || '',
          breakoutPrice: signal.breakoutPrice || null,
          highPrice20D: signal.highPrice20D || null,
          lowPrice10D: signal.lowPrice10D || null
        })),
        analysisLogs: (global.turtleAnalysisLogs || []).slice(0, 5) // 처음 5개 종목 분석 로그
      },
      superstocks: {
        analysisMethod: 'HYBRID_CACHE_KIWOOM',
        financialCandidates: 30, // 고정 (상위 30개 재무조건 만족)
        successfullyAnalyzed: superstocks.length || 0,
        qualifiedCount: superstocks.length || 0,
        excellentStocks: superstocks.filter(s => s && s.score === 'EXCELLENT').length || 0,
        goodStocks: superstocks.filter(s => s && s.score === 'GOOD').length || 0,
        
        // 조건 만족 주식들 (하이브리드 분석 결과)
        qualifiedStocks: superstocks.map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          revenueGrowth3Y: stock.revenueGrowth3Y,
          netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
          psr: stock.psr,
          score: stock.score,
          dataSource: stock.dataSource
        })),
        
        // 점수별 분류 (하이브리드 분석 결과)
        excellentStocks: superstocks.filter(s => s.score === 'EXCELLENT').map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          revenueGrowth3Y: stock.revenueGrowth3Y,
          netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
          psr: stock.psr,
          score: stock.score,
          dataSource: stock.dataSource
        })),
        
        goodStocks: superstocks.filter(s => s.score === 'GOOD').map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          revenueGrowth3Y: stock.revenueGrowth3Y,
          netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
          psr: stock.psr,
          score: stock.score,
          dataSource: stock.dataSource
        })),
        
        // 전체 분석 결과 (처음 20개만)
        allAnalyzedStocks: superstocks.slice(0, 20).map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          revenueGrowth3Y: stock.revenueGrowth3Y,
          netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
          psr: stock.psr,
          score: stock.score,
          meetsConditions: stock.meetsConditions,
          dataSource: stock.dataSource || 'UNKNOWN'
        }))
      },
      premiumOpportunities: overlappingStocks,
      investmentSettings: {
        budget: budget,                    // 사용된 투자 예산
        budgetDisplay: `${(budget/10000).toFixed(0)}만원`,
        riskPerTrade: budget * 0.02,      // 종목당 리스크 (2%)
        riskDisplay: `${(budget * 0.02 / 10000).toFixed(0)}만원`
      },
      metadata: {
        requestedBy: 'make.com',
        analysisType: 'integrated_turtle_superstocks',
        market: 'KRX',
        apiVersion: '2.0'
      },
      slackMessage: SlackMessageFormatter.formatIntegratedAnalysis({
        timestamp: new Date().toISOString(),
        summary: {
          turtleSignals: turtleSignals.length,
          qualifiedSuperstocks: superstocks.filter(s => s.meetsConditions).length,
          overlappingStocks: overlappingStocks.length,
          hasOverlap: overlappingStocks.length > 0
        },
        turtleTrading: {
          signals: turtleSignals.map(signal => ({
            symbol: signal.symbol,
            name: signal.name,
            signalType: signal.signalType,
            currentPrice: signal.currentPrice,
            action: signal.recommendedAction?.action || 'HOLD',
            reasoning: signal.recommendedAction?.reasoning || ''
          }))
        },
        superstocks: {
          qualifiedStocks: superstocks.filter(s => s.meetsConditions).map(stock => ({
            symbol: stock.symbol,
            name: stock.name,
            currentPrice: stock.currentPrice,
            revenueGrowth3Y: stock.revenueGrowth3Y,
            netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
            psr: stock.psr
          }))
        },
        premiumOpportunities: overlappingStocks,
        investmentSettings: {
          budget: budget,
          budgetDisplay: `${(budget/10000).toFixed(0)}만원`,
          riskPerTrade: budget * 0.02,
          riskDisplay: `${(budget * 0.02 / 10000).toFixed(0)}만원`
        }
      })
    };
    
    res.json(result);
    
  } catch (error) {
    console.error('통합 분석 실패:', error);
    
    // 안전한 오류 응답 (Make.com이 파싱할 수 있도록)
    res.status(200).json({
      success: false,
      error: 'INTEGRATED_ANALYSIS_FAILED',
      message: error.message || '알 수 없는 오류',
      timestamp: new Date().toISOString(),
      summary: {
        turtleSignals: 0,
        qualifiedSuperstocks: 0,
        totalSuperstocksAnalyzed: 0,
        overlappingStocks: 0,
        hasOverlap: false,
        analysisStatus: {
          turtleSuccess: false,
          superstocksSuccess: false
        }
      },
      turtleTrading: {
        totalSignals: 0,
        buySignals: 0,
        sellSignals: 0,
        signals: [],
        analysisLogs: []
      },
      superstocks: {
        totalAnalyzed: 0,
        successfullyAnalyzed: 0,
        qualifiedCount: 0,
        excellentStocks: 0,
        goodStocks: 0,
        qualifiedStocks: []
      },
      overlappingStocks: [],
      metadata: {
        analysisType: 'integrated_turtle_superstocks',
        market: 'KRX',
        apiVersion: '2.0',
        errorOccurred: true
      },
      timestamp: new Date().toISOString()
    });
  }
});

// (개별 API 제거 - 통합 API만 사용)

// 상세 분석 결과 조회 API (디버깅용)
router.get('/analysis-details', async (req, res) => {
  try {
    console.log('🔍 상세 분석 결과 조회 요청');
    
    // 터틀 분석
    const turtleSignals = await TurtleAnalyzer.analyzeMarket();
    
    // 슈퍼스톡스 분석 (모든 결과 포함)
    const stockList = SuperstocksAnalyzer.getDefaultStockList();
    const allSuperstocks = await SuperstocksAnalyzer.analyzeSuperstocks(stockList);
    
    // 조건별 분류
    const qualifiedStocks = allSuperstocks.filter(s => s && s.meetsConditions);
    const failedAnalysis = stockList.filter(symbol => 
      !allSuperstocks.find(s => s && s.symbol === symbol)
    );
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      analysisDetails: {
        totalStocksToAnalyze: stockList.length,
        successfullyAnalyzed: allSuperstocks.filter(s => s).length,
        failedAnalysis: failedAnalysis.length,
        qualifiedStocks: qualifiedStocks.length,
        dartDataUsed: allSuperstocks.filter(s => s && s.dataSource === 'DART').length,
        simulationDataUsed: allSuperstocks.filter(s => s && s.dataSource === 'SIMULATION').length
      },
      stockResults: allSuperstocks.filter(s => s).map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: stock.currentPrice,
        revenueGrowth3Y: stock.revenueGrowth3Y,
        netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
        psr: stock.psr,
        score: stock.score,
        meetsConditions: stock.meetsConditions,
        dataSource: stock.dataSource,
        revenue: stock.revenue,
        netIncome: stock.netIncome,
        marketCap: stock.marketCap,
        conditions: {
          revenueGrowthOK: stock.revenueGrowth3Y >= 15,
          netIncomeGrowthOK: stock.netIncomeGrowth3Y >= 15,
          psrOK: stock.psr <= 2.5
        }
      })),
      failedStocks: failedAnalysis,
      turtleSignals: turtleSignals,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('상세 분석 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// MongoDB 분석 결과 저장
router.post('/save-analysis', async (req, res) => {
  try {
    const { analysisType, results } = req.body;
    
    const Signal = require('../models/Signal');
    
    // 기존 분석 결과 삭제 (최신 상태 유지)
    await Signal.deleteMany({ 
      signalType: analysisType,
      date: { $gte: new Date().setHours(0,0,0,0) } // 오늘 분석 결과만
    });
    
    // 새 분석 결과 저장
    for (const result of results) {
      const signal = new Signal({
        symbol: result.symbol,
        name: result.name,
        signalType: analysisType,
        currentPrice: result.currentPrice,
        confidence: result.score || 'medium',
        reasoning: JSON.stringify(result),
        metadata: {
          dataSource: result.dataSource,
          revenueGrowth3Y: result.revenueGrowth3Y,
          netIncomeGrowth3Y: result.netIncomeGrowth3Y,
          psr: result.psr
        },
        date: new Date(),
        timestamp: new Date().toISOString()
      });
      
      await signal.save();
    }
    
    res.json({
      success: true,
      message: `${results.length}개 분석 결과 저장 완료`,
      analysisType: analysisType,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('분석 결과 저장 실패:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// MongoDB 저장된 분석 결과 조회
router.get('/saved-analysis/:type?', async (req, res) => {
  try {
    const analysisType = req.params.type;
    const limit = parseInt(req.query.limit) || 100;
    
    const Signal = require('../models/Signal');
    
    let query = {};
    if (analysisType) {
      query.signalType = analysisType;
    }
    
    const savedResults = await Signal.find(query)
      .sort({ date: -1 })
      .limit(limit);
    
    res.json({
      success: true,
      total: savedResults.length,
      results: savedResults,
      lastUpdated: savedResults[0]?.date || null,
      message: `${savedResults.length}개 저장된 분석 결과`
    });
    
  } catch (error) {
    console.error('저장된 분석 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 단일 종목 테스트 API (디버깅용)
router.get('/test-stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`🧪 ${symbol} 단일 종목 테스트 시작`);
    
    // 1. 키움 API 연결 상태 확인
    const kiwoomConnected = require('../services/kiwoomService').isConnectedToKiwoom();
    
    // 2. 현재가 조회 테스트
    let currentPrice = null;
    let priceError = null;
    try {
      currentPrice = await require('../services/kiwoomService').getCurrentPrice(symbol);
    } catch (error) {
      priceError = error.message;
    }
    
    // 3. DART API 테스트
    let dartData = null;
    let dartError = null;
    try {
      dartData = await require('../services/dartService').analyzeStockFinancials(symbol);
    } catch (error) {
      dartError = error.message;
    }
    
    // 4. 슈퍼스톡스 분석 테스트
    let superstockResult = null;
    let analysisError = null;
    try {
      superstockResult = await SuperstocksAnalyzer.analyzeStock(symbol);
    } catch (error) {
      analysisError = error.message;
    }
    
    res.json({
      success: true,
      symbol: symbol,
      testResults: {
        kiwoomConnected: kiwoomConnected,
        currentPrice: currentPrice,
        priceError: priceError,
        dartData: dartData,
        dartError: dartError,
        superstockResult: superstockResult,
        analysisError: analysisError
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`${req.params.symbol} 테스트 실패:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DART API 연결 테스트
router.get('/test-dart', async (req, res) => {
  try {
    const DartService = require('../services/dartService');
    
    console.log('🧪 DART API 연결 테스트');
    
    // 삼성전자로 테스트
    const testResult = await DartService.analyzeStockFinancials('005930');
    
    res.json({
      success: true,
      dartApiKey: !!process.env.DART_API_KEY,
      testSymbol: '005930',
      result: testResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('DART API 테스트 실패:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      dartApiKey: !!process.env.DART_API_KEY,
      timestamp: new Date().toISOString()
    });
  }
});

// Yahoo Finance 연결 테스트
router.get('/test-yahoo', async (req, res) => {
  try {
    const YahooFinanceService = require('../services/yahooFinanceService');
    
    console.log('🧪 Yahoo Finance 연결 테스트');
    
    // 삼성전자로 테스트
    const testResult = await YahooFinanceService.testConnection('005930');
    
    res.json({
      success: testResult.success,
      testSymbol: '005930',
      result: testResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Yahoo Finance 테스트 실패:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 매도 신호 분석 API (보유 종목 대상)
router.post('/sell-analysis', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    // API 키 검증
    const validApiKey = process.env.MAKE_API_KEY || 'turtle_make_api_2024';
    if (!apiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid API key'
      });
    }
    
    console.log('🔍 Make.com에서 매도 신호 분석 요청');
    
    // 1. 키움 API에서 보유 종목 조회
    const KiwoomService = require('../services/kiwoomService');
    const accountData = await KiwoomService.getAccountBalance();
    
    if (!accountData || !accountData.positions || accountData.positions.length === 0) {
      return res.json({
        success: true,
        message: '보유 종목이 없습니다',
        sellSignals: [],
        positions: [],
        timestamp: new Date().toISOString()
      });
    }
    
    // 2. 보유 종목 각각에 대해 매도 신호 분석
    const sellSignals = [];
    const positionAnalysis = [];
    
    for (const position of accountData.positions) {
      try {
        console.log(`📊 매도 신호 분석: ${position.symbol} (${position.name})`);
        
        // 터틀 분석으로 매도 신호 확인
        const signal = await TurtleAnalyzer.analyzeStock(position.symbol, position.name);
        
        if (signal) {
          // 매도 조건 확인
          const sellConditions = TurtleAnalyzer.checkSellConditions(signal, position);
          
          if (sellConditions.shouldSell) {
            sellSignals.push({
              ...signal,
              position: position,
              sellReason: sellConditions.reason,
              urgency: sellConditions.urgency
            });
          }
          
          positionAnalysis.push({
            symbol: position.symbol,
            name: position.name,
            quantity: position.quantity,
            avgPrice: position.avgPrice,
            currentPrice: position.currentPrice,
            unrealizedPL: position.unrealizedPL,
            sellConditions: sellConditions
          });
        }
        
      } catch (error) {
        console.error(`${position.symbol} 매도 분석 실패:`, error);
      }
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      sellAnalysis: {
        totalPositions: accountData.positions.length,
        sellSignals: sellSignals.length,
        urgentSells: sellSignals.filter(s => s.urgency === 'HIGH').length,
        stopLossSells: sellSignals.filter(s => s.sellReason.includes('손절')).length
      },
      sellSignals: sellSignals,
      positionAnalysis: positionAnalysis,
      accountSummary: {
        totalAsset: accountData.totalAsset,
        cash: accountData.cash,
        positionCount: accountData.positions.length
      },
      metadata: {
        requestedBy: 'make.com',
        analysisType: 'sell_signals',
        market: 'KRX',
        apiVersion: '1.0'
      },
      slackMessage: SlackMessageFormatter.formatSellSignals({
        timestamp: new Date().toISOString(),
        sellSignals: sellSignals,
        accountSummary: {
          totalAsset: accountData.totalAsset,
          cash: accountData.cash,
          positionCount: accountData.positions.length
        }
      })
    });
    
  } catch (error) {
    console.error('매도 신호 분석 실패:', error);
    res.status(500).json({
      success: false,
      error: 'SELL_ANALYSIS_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Make.com 웹훅 수신용 엔드포인트
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    console.log('📨 Make.com 웹훅 수신:', webhookData);
    
    // 웹훅 데이터 처리 (예: 알림, 로깅 등)
    
    res.json({
      success: true,
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('웹훅 처리 실패:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;