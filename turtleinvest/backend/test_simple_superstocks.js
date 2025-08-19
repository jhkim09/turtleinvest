/**
 * 간단한 슈퍼스톡스 테스트 (소수 종목)
 */

const express = require('express');
const cors = require('cors');

// 간단한 테스트 서버
const app = express();
app.use(cors());
app.use(express.json());

// 테스트용 슈퍼스톡스 검색 API
app.post('/api/test/superstocks', async (req, res) => {
  try {
    console.log('🧪 테스트 슈퍼스톡스 검색 시작...');
    
    const { apiKey, testMode = true } = req.body;
    
    // API 키 확인
    if (apiKey !== 'test_key') {
      return res.status(401).json({
        success: false,
        error: 'INVALID_API_KEY',
        message: 'Test API key required: test_key'
      });
    }
    
    // 테스트용 결과 (실제 데이터 대신)
    const testResults = [
      {
        symbol: '005930',
        name: '삼성전자',
        currentPrice: 71200,
        revenue: 2790000,
        netIncome: 265000,
        revenueGrowth3Y: 8.5,
        netIncomeGrowth3Y: 12.3,
        psr: 0.68,
        score: 'GOOD',
        meetsConditions: false // PSR은 좋지만 성장률 부족
      },
      {
        symbol: '035420',
        name: 'NAVER',
        currentPrice: 152000,
        revenue: 89000,
        netIncome: 13500,
        revenueGrowth3Y: 18.2,
        netIncomeGrowth3Y: 22.1,
        psr: 0.45,
        score: 'EXCELLENT',
        meetsConditions: true // 모든 조건 만족
      }
    ];
    
    const qualifiedStocks = testResults.filter(stock => stock.meetsConditions);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      processingTime: '0.1초',
      testMode: true,
      searchConditions: {
        minRevenueGrowth: 15,
        minNetIncomeGrowth: 15,
        maxPSR: 0.75
      },
      summary: {
        totalAnalyzed: testResults.length,
        qualifiedStocks: qualifiedStocks.length,
        excellentStocks: testResults.filter(s => s.score === 'EXCELLENT').length,
        performance: {
          cacheHitRate: 'Test',
          totalProcessingTime: '0.1초'
        }
      },
      qualifiedStocks: qualifiedStocks,
      allResults: testResults,
      metadata: {
        apiVersion: '3.0-test',
        optimizations: ['Test Mode']
      }
    });
    
  } catch (error) {
    console.error('테스트 API 실패:', error);
    res.status(500).json({
      success: false,
      error: 'TEST_FAILED',
      message: error.message
    });
  }
});

// 헬스체크
app.get('/api/test/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    message: 'Test server running',
    timestamp: new Date().toISOString()
  });
});

// 서버 시작
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🧪 테스트 서버 시작: http://localhost:${PORT}`);
  console.log(`📡 테스트 API: POST /api/test/superstocks (apiKey: "test_key")`);
  console.log(`💚 헬스체크: GET /api/test/health`);
});