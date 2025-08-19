const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

// 라우트 임포트
const positionRoutes = require('./routes/positions');
const tradeRoutes = require('./routes/trades');
const settingsRoutes = require('./routes/settings');
const signalRoutes = require('./routes/signals');
const kiwoomRoutes = require('./routes/kiwoom');
const testRoutes = require('./routes/test');
const financialDataRoutes = require('./routes/financialData');

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 (로컬 프론트엔드 접근 허용)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://localhost:3003',
    'https://turtleinvest.onrender.com'
  ],
  credentials: true
}));
app.use(express.json());

// MongoDB 연결 (연결 실패해도 서버는 동작)
const mongoOptions = {
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 1000
  }
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/turtleinvest', mongoOptions)
.then(() => {
  console.log('🐢 MongoDB 연결 성공!');
  console.log('Database: turtleinvest');
})
.catch(err => {
  console.log('❌ MongoDB 연결 실패 - 메모리 모드로 실행');
  console.log('💡 나중에 MongoDB 설정하여 데이터 영구 저장 가능');
});

// API 라우트
app.use('/api/positions', positionRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/signals', signalRoutes);
app.use('/api/kiwoom', kiwoomRoutes);
app.use('/api/test', testRoutes);
app.use('/api/financial-data', financialDataRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TurtleInvest API is running',
    timestamp: new Date().toISOString()
  });
});

// 매일 아침 8시 터틀 분석 실행
cron.schedule('0 8 * * 1-5', async () => {
  console.log('🐢 터틀 트레이딩 일일 분석 시작...');
  try {
    const TurtleAnalyzer = require('./services/turtleAnalyzer');
    const NotificationService = require('./services/notificationService');
    
    // 1. 시장 데이터 분석
    const signals = await TurtleAnalyzer.analyzeMarket();
    
    // 2. 포지션 기반 리스크 계산
    const riskAnalysis = await TurtleAnalyzer.calculateRisk();
    
    // 3. Make.com 알람 발송
    await NotificationService.sendDailyReport(signals, riskAnalysis);
    
    console.log('✅ 일일 분석 및 알람 완료');
  } catch (error) {
    console.error('❌ 일일 분석 실패:', error);
  }
}, {
  timezone: "Asia/Seoul"
});

// 연 1회 재무데이터 업데이트 (4월 1일 오전 6시)
cron.schedule('0 6 1 4 *', async () => {
  console.log('📅 연간 재무데이터 업데이트 시작 (4월 1일)...');
  try {
    const FinancialDataCacheService = require('./services/financialDataCacheService');
    const SuperstocksAnalyzer = require('./services/superstocksAnalyzer');
    
    // 1. 데이터 년도 업데이트 체크
    const yearUpdated = FinancialDataCacheService.checkDataYearUpdate();
    if (yearUpdated) {
      console.log('📊 새로운 재무데이터 수집년도로 업데이트됨');
    }
    
    // 2. 통합 500개 종목 재무데이터 일괄 수집
    const StockListService = require('./services/stockListService');
    const stockCodes = StockListService.getUnifiedStockList();
    const stats = StockListService.getStatistics();
    
    console.log(`📊 대상 종목: ${stats.total}개 (코스피 ${stats.kospi}개 + 코스닥 ${stats.kosdaq}개)`);
    const results = await FinancialDataCacheService.bulkCollectFinancialData(stockCodes, 6); // 500개라서 더 작은 배치
    
    // 3. 오래된 캐시 데이터 정리 (2년 이상)
    const cleanedCount = await FinancialDataCacheService.cleanupOldCache(2);
    
    console.log(`✅ 연간 재무데이터 업데이트 완료: ${results.success}개 수집, ${cleanedCount}개 정리`);
    
  } catch (error) {
    console.error('❌ 연간 재무데이터 업데이트 실패:', error);
  }
}, {
  timezone: "Asia/Seoul"
});

app.listen(PORT, () => {
  console.log(`🚀 TurtleInvest Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});