const express = require('express');
const router = express.Router();
const Signal = require('../models/Signal');
const TurtleAnalyzer = require('../services/turtleAnalyzer');
const SuperstocksAnalyzer = require('../services/superstocksAnalyzer');
const SlackMessageFormatter = require('../services/slackMessageFormatter');

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
    
    // 터틀 분석
    const turtleSignals = await TurtleAnalyzer.analyzeMarket();
    
    // 슈퍼스톡스 분석
    const stockList = symbols || SuperstocksAnalyzer.getDefaultStockList();
    const superstocks = await SuperstocksAnalyzer.analyzeSuperstocks(stockList);
    
    // 두 조건 모두 만족하는 주식 찾기
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
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        turtleSignals: turtleSignals.length,
        qualifiedSuperstocks: superstocks.length,
        overlappingStocks: overlappingStocks.length,
        hasOverlap: overlappingStocks.length > 0
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
        totalAnalyzed: stockList.length,
        qualifiedStocks: superstocks.filter(s => s.meetsConditions).length,
        excellentStocks: superstocks.filter(s => s.score === 'EXCELLENT').length,
        goodStocks: superstocks.filter(s => s.score === 'GOOD').length,
        
        // 조건 만족 주식들
        qualifiedStocks: superstocks.filter(s => s.meetsConditions).map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          revenueGrowth3Y: stock.revenueGrowth3Y,
          netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
          psr: stock.psr,
          score: stock.score,
          dataSource: stock.dataSource
        })),
        
        // 점수별 분류
        excellentStocks: superstocks.filter(s => s.score === 'EXCELLENT').map(stock => ({
          symbol: stock.symbol,
          name: stock.name,
          currentPrice: stock.currentPrice,
          revenueGrowth3Y: stock.revenueGrowth3Y,
          netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
          psr: stock.psr,
          score: stock.score,
          meetsConditions: stock.meetsConditions,
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
          meetsConditions: stock.meetsConditions,
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
    res.status(500).json({
      success: false,
      error: 'INTEGRATED_ANALYSIS_FAILED',
      message: error.message,
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