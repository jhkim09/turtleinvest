/**
 * 캐시 기반 고속 슈퍼스톡스 검색 API
 */

const express = require('express');
const router = express.Router();
const FinancialData = require('../models/FinancialData');

// 고속 슈퍼스톡스 검색 (캐시 기반)
router.post('/search', async (req, res) => {
  try {
    const startTime = Date.now();
    
    const { 
      apiKey, 
      conditions = {},
      includeDetails = false
    } = req.body;

    console.log('⚡ 캐시 기반 슈퍼스톡스 검색 요청:', {
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing',
      conditions,
      includeDetails
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

    // 검색 조건 설정 (현실적인 기본값)
    const searchConditions = {
      minRevenueGrowth: conditions.minRevenueGrowth || 15,
      minNetIncomeGrowth: conditions.minNetIncomeGrowth || 15,
      maxPSR: conditions.maxPSR || 2.5, // 현실적인 PSR 조건
      minPrice: conditions.minPrice || 1000,
      maxPrice: conditions.maxPrice || 500000,
      minRevenue: conditions.minRevenue || 100 // 최소 매출 100억원
    };

    console.log(`📋 검색 조건: 매출성장률 ≥${searchConditions.minRevenueGrowth}%, 순이익성장률 ≥${searchConditions.minNetIncomeGrowth}%, PSR ≤${searchConditions.maxPSR}`);

    // 1. MongoDB에서 1차 필터링 (재무 조건)
    const candidates = await FinancialData.find({
      dataYear: 2025, // 최신 수집년도
      revenueGrowth3Y: { $gte: searchConditions.minRevenueGrowth },
      netIncomeGrowth3Y: { $gte: searchConditions.minNetIncomeGrowth },
      revenue: { $gte: searchConditions.minRevenue },
      sharesOutstanding: { $gt: 0 }
    }).sort({ revenueGrowth3Y: -1 });

    console.log(`📊 1차 필터링: ${candidates.length}개 후보 (소요시간: ${((Date.now() - startTime)/1000).toFixed(2)}초)`);

    // 2. 현재가 Mock 데이터 (실제 환경에서는 키움/Yahoo API)
    const mockPrices = {
      '005930': 71200,  // 삼성전자
      '035420': 152000, // NAVER  
      '000660': 127000, // SK하이닉스
      '352820': 180000, // 하이브
      '326030': 95000,  // SK바이오팜
      '251270': 45000,  // 넷마블
      '036570': 210000, // 엔씨소프트
      '068270': 165000, // 셀트리온
      '005380': 45000,  // 현대차
      '028260': 35000   // 삼성물산
    };

    // 3. PSR 계산 및 최종 필터링
    const qualifiedStocks = [];
    const allResults = [];

    candidates.forEach(stock => {
      const currentPrice = mockPrices[stock.stockCode] || (Math.random() * 80000 + 20000); // 2만~10만원 랜덤
      
      // 가격 조건 확인
      if (currentPrice < searchConditions.minPrice || currentPrice > searchConditions.maxPrice) {
        return;
      }

      // PSR 계산
      const marketCap = currentPrice * stock.sharesOutstanding;
      const revenueInWon = stock.revenue * 100000000;
      const psr = revenueInWon > 0 ? marketCap / revenueInWon : 999;

      // 점수 계산
      let score = 0;
      if (stock.revenueGrowth3Y >= 30) score += 50;
      else if (stock.revenueGrowth3Y >= 20) score += 40;
      else if (stock.revenueGrowth3Y >= 15) score += 30;

      if (stock.netIncomeGrowth3Y >= 30) score += 50;
      else if (stock.netIncomeGrowth3Y >= 20) score += 40;
      else if (stock.netIncomeGrowth3Y >= 15) score += 30;

      if (psr <= 1.0) score += 20;
      else if (psr <= 2.0) score += 15;
      else if (psr <= 2.5) score += 10;

      const grade = score >= 90 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 50 ? 'FAIR' : 'POOR';
      const meetsConditions = psr <= searchConditions.maxPSR;

      const result = {
        symbol: stock.stockCode,
        name: stock.name,
        currentPrice: currentPrice,
        revenue: stock.revenue,
        netIncome: stock.netIncome,
        revenueGrowth3Y: stock.revenueGrowth3Y,
        netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
        psr: Math.round(psr * 1000) / 1000,
        marketCap: marketCap,
        score: grade,
        numericScore: score,
        meetsConditions: meetsConditions,
        dataSource: stock.dataSource,
        lastUpdated: stock.lastUpdated
      };

      allResults.push(result);
      
      if (meetsConditions) {
        qualifiedStocks.push(result);
      }
    });

    // 4. 결과 정렬
    qualifiedStocks.sort((a, b) => b.numericScore - a.numericScore);
    allResults.sort((a, b) => b.numericScore - a.numericScore);

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`⚡ 캐시 기반 검색 완료: ${qualifiedStocks.length}개 조건 만족 (총 ${allResults.length}개 분석, 소요시간: ${processingTime}초)`);

    // 5. 응답 생성
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      processingTime: processingTime + '초',
      searchConditions,
      summary: {
        totalAnalyzed: allResults.length,
        qualifiedStocks: qualifiedStocks.length,
        excellentStocks: qualifiedStocks.filter(s => s.score === 'EXCELLENT').length,
        goodStocks: qualifiedStocks.filter(s => s.score === 'GOOD').length,
        averagePSR: allResults.length > 0 ? (allResults.reduce((sum, s) => sum + s.psr, 0) / allResults.length).toFixed(3) : 0,
        performance: {
          cacheHitRate: '100%',
          dataSource: 'MongoDB Cache',
          totalProcessingTime: processingTime + '초'
        }
      },
      qualifiedStocks: qualifiedStocks.slice(0, 50),
      excellentStocks: qualifiedStocks.filter(s => s.score === 'EXCELLENT').slice(0, 20),
      goodStocks: qualifiedStocks.filter(s => s.score === 'GOOD').slice(0, 20)
    };

    // 상세 정보 포함
    if (includeDetails) {
      response.allResults = allResults.slice(0, 100);
      response.searchMetadata = {
        cacheDataYear: 2025,
        candidatesFromDB: candidates.length,
        priceDataSource: 'mock', // 실제 환경에서는 'kiwoom' 또는 'yahoo'
        filteringSteps: [
          `MongoDB 쿼리: ${candidates.length}개`,
          `가격 필터링: ${allResults.length}개`,
          `PSR 필터링: ${qualifiedStocks.length}개`
        ]
      };
    }

    // 조건 만족 종목 로그 출력
    if (qualifiedStocks.length > 0) {
      console.log('🏆 발견된 종목들:');
      qualifiedStocks.slice(0, 5).forEach(stock => {
        console.log(`   ${stock.symbol} ${stock.name}: ${stock.currentPrice}원, 매출성장률 ${stock.revenueGrowth3Y}%, PSR ${stock.psr} (${stock.score})`);
      });
    }

    res.json(response);

  } catch (error) {
    console.error('❌ 캐시 기반 슈퍼스톡스 검색 실패:', error);
    res.status(500).json({
      success: false,
      error: 'CACHE_SEARCH_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 캐시 상태 조회
router.get('/cache-status', async (req, res) => {
  try {
    const stats = await FinancialData.aggregate([
      {
        $group: {
          _id: {
            dataYear: '$dataYear',
            dataSource: '$dataSource'
          },
          count: { $sum: 1 },
          avgRevenue: { $avg: '$revenue' },
          avgRevenueGrowth: { $avg: '$revenueGrowth3Y' },
          maxRevenueGrowth: { $max: '$revenueGrowth3Y' },
          lastUpdated: { $max: '$lastUpdated' }
        }
      },
      {
        $sort: { '_id.dataYear': -1, '_id.dataSource': 1 }
      }
    ]);

    res.json({
      success: true,
      cacheStatistics: stats,
      summary: {
        totalRecords: stats.reduce((sum, stat) => sum + stat.count, 0),
        latestDataYear: Math.max(...stats.map(stat => stat._id.dataYear)),
        lastUpdated: stats.length > 0 ? stats[0].lastUpdated : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('캐시 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 특정 종목 캐시 데이터 조회
router.get('/stock/:stockCode', async (req, res) => {
  try {
    const { stockCode } = req.params;
    
    const stockData = await FinancialData.findOne({
      stockCode: stockCode,
      dataYear: 2025
    });

    if (!stockData) {
      return res.status(404).json({
        success: false,
        message: `${stockCode} 캐시 데이터 없음`
      });
    }

    res.json({
      success: true,
      stockData: {
        symbol: stockData.stockCode,
        name: stockData.name,
        year: stockData.year,
        revenue: stockData.revenue,
        netIncome: stockData.netIncome,
        revenueGrowth3Y: stockData.revenueGrowth3Y,
        netIncomeGrowth3Y: stockData.netIncomeGrowth3Y,
        sharesOutstanding: stockData.sharesOutstanding,
        dataSource: stockData.dataSource,
        lastUpdated: stockData.lastUpdated
      }
    });

  } catch (error) {
    console.error(`종목 데이터 조회 실패 (${req.params.stockCode}):`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 키움 기반 실시간 슈퍼스톡스 분석 (신규)
router.post('/kiwoom-search', async (req, res) => {
  try {
    const startTime = Date.now();
    
    const { 
      apiKey, 
      symbols,
      conditions = {},
      realtime = true
    } = req.body;

    console.log('🚀 키움 기반 실시간 슈퍼스톡스 검색 요청:', {
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing',
      symbols: symbols ? symbols.length : 'default',
      conditions,
      realtime
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

    // 키움 슈퍼스톡스 서비스 사용
    const KiwoomSuperstocksService = require('../services/kiwoomSuperstocksService');
    
    const targetStocks = symbols || [
      // 주요 종목만 (안정적 테스트)
      '005930', '000660', '035420', '005380', '000270',
      '051910', '035720', '251270', '036570', '352820',
      '326030', '145020', '042700'
    ];

    console.log(`⚡ 키움 REST API로 ${targetStocks.length}개 종목 실시간 분석...`);

    const analysisResult = await KiwoomSuperstocksService.analyzeSuperstocksWithKiwoom(targetStocks);

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`⚡ 키움 기반 검색 완료: ${analysisResult.qualifiedStocks.length}개 발견 (소요시간: ${processingTime}초)`);

    // 응답 생성
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      processingTime: processingTime + '초',
      searchMethod: 'KIWOOM_REALTIME',
      searchConditions: {
        minRevenueGrowth: 15,
        minNetIncomeGrowth: 15,
        maxPSR: 2.5,
        maxPBR: 3.0,
        minROE: 10,
        realtime: realtime
      },
      summary: {
        totalAnalyzed: analysisResult.totalAnalyzed,
        qualifiedStocks: analysisResult.qualifiedStocks.length,
        excellentStocks: analysisResult.summary.excellent,
        goodStocks: analysisResult.summary.good,
        performance: {
          dataSource: 'Kiwoom REST API + Cache',
          realTimeData: true,
          totalProcessingTime: processingTime + '초'
        }
      },
      qualifiedStocks: analysisResult.qualifiedStocks.slice(0, 20),
      excellentStocks: analysisResult.allResults.filter(s => s.grade === 'EXCELLENT').slice(0, 10),
      goodStocks: analysisResult.allResults.filter(s => s.grade === 'GOOD').slice(0, 10),
      metadata: {
        apiVersion: '4.0',
        dataSource: 'kiwoom_rest_api',
        optimizations: [
          'Kiwoom REST API',
          'Real-time Stock Data',
          'Hybrid Financial Analysis',
          'PBR/ROE Multi-Factor Analysis'
        ]
      }
    };

    // 조건 만족 종목 로그
    if (analysisResult.qualifiedStocks.length > 0) {
      console.log('🏆 키움 기반 발견 종목:');
      analysisResult.qualifiedStocks.slice(0, 5).forEach(stock => {
        console.log(`   ${stock.symbol} ${stock.name}: ${stock.currentPrice}원, PSR ${stock.psr}, PBR ${stock.pbr}, ROE ${stock.roe}% (${stock.grade})`);
      });
    }

    res.json(response);

  } catch (error) {
    console.error('❌ 키움 기반 슈퍼스톡스 검색 실패:', error);
    res.status(500).json({
      success: false,
      error: 'KIWOOM_SEARCH_FAILED',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 키움 API 연결 테스트
router.get('/test-kiwoom', async (req, res) => {
  try {
    console.log('🧪 키움 REST API 연결 테스트...');
    
    const KiwoomService = require('../services/kiwoomService');
    
    // 삼성전자로 테스트
    const testResult = await KiwoomService.getStockInfo('005930');
    
    res.json({
      success: !!testResult,
      testSymbol: '005930',
      result: testResult,
      kiwoomConfig: {
        appKey: process.env.KIWOOM_APP_KEY ? 'configured' : 'missing',
        secretKey: process.env.KIWOOM_SECRET_KEY ? 'configured' : 'missing',
        isConnected: KiwoomService.isConnectedToKiwoom()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 키움 API 테스트 실패:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 초경량 고속 슈퍼스톡스 검색 (Make.com 전용)
router.post('/quick-search', async (req, res) => {
  try {
    const startTime = Date.now();
    
    const { apiKey, conditions = {} } = req.body;

    // API 키 검증
    const validApiKey = process.env.MAKE_API_KEY || 'turtle_make_api_2024';
    if (!apiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid API key'
      });
    }

    console.log('⚡ 초경량 슈퍼스톡스 검색 (Make.com 전용)...');

    // 검색 조건 (더 엄격하게)
    const searchConditions = {
      minRevenueGrowth: conditions.minRevenueGrowth || 20,
      minNetIncomeGrowth: conditions.minNetIncomeGrowth || 20,
      maxPSR: conditions.maxPSR || 2.0,
      minRevenue: conditions.minRevenue || 1000
    };

    // MongoDB에서 직접 조건 필터링 (캐시만 사용, DART 호출 없음)
    const qualifiedStocks = await FinancialData.find({
      dataYear: 2025,
      dataSource: 'ESTIMATED', // 캐시된 데이터만
      revenueGrowth3Y: { $gte: searchConditions.minRevenueGrowth },
      netIncomeGrowth3Y: { $gte: searchConditions.minNetIncomeGrowth },
      revenue: { $gte: searchConditions.minRevenue }
    }).sort({ revenueGrowth3Y: -1 }).limit(20); // 상위 20개만

    console.log(`📊 초경량 검색 완료: ${qualifiedStocks.length}개 발견`);

    // 간단한 PSR 계산 (평균 가격 5만원 기준)
    const results = qualifiedStocks.map(stock => {
      const avgPrice = 50000;
      const marketCap = avgPrice * stock.sharesOutstanding;
      const revenueInWon = stock.revenue * 100000000;
      const psr = revenueInWon > 0 ? marketCap / revenueInWon : 999;
      
      return {
        symbol: stock.stockCode,
        name: stock.name,
        estimatedPrice: avgPrice,
        revenue: stock.revenue,
        revenueGrowth3Y: stock.revenueGrowth3Y,
        netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
        estimatedPSR: Math.round(psr * 1000) / 1000,
        score: stock.revenueGrowth3Y >= 30 ? 'EXCELLENT' : 'GOOD'
      };
    }).filter(stock => stock.estimatedPSR <= searchConditions.maxPSR);

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    // 초경량 응답
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      processingTime: processingTime + '초',
      method: 'ULTRA_FAST_CACHE_ONLY',
      summary: {
        found: results.length,
        excellentStocks: results.filter(s => s.score === 'EXCELLENT').length
      },
      stocks: results.slice(0, 10), // 상위 10개만
      message: 'Make.com 전용 초고속 검색'
    });

  } catch (error) {
    console.error('❌ 초경량 검색 실패:', error);
    res.status(500).json({
      success: false,
      error: 'QUICK_SEARCH_FAILED',
      message: error.message
    });
  }
});

module.exports = router;