const express = require('express');
const router = express.Router();
const Signal = require('../models/Signal');
const TurtleAnalyzer = require('../services/turtleAnalyzer');

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

// 수동 분석 실행
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

// Make.com 전용 신호분석 API
router.post('/make-analysis', async (req, res) => {
  try {
    const { apiKey, watchlist, riskSettings } = req.body;
    
    // API 키 검증 (간단한 검증)
    const validApiKey = process.env.MAKE_API_KEY || 'turtle_make_api_2024';
    if (!apiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid API key'
      });
    }
    
    console.log('🔧 Make.com에서 신호분석 요청');
    
    // 터틀 분석 실행
    const signals = await TurtleAnalyzer.analyzeMarket();
    
    // Make.com 친화적 포맷으로 응답
    const analysisResult = {
      success: true,
      timestamp: new Date().toISOString(),
      analysis: {
        totalSignals: signals.length,
        buySignals: signals.filter(s => s.signalType === 'BUY').length,
        sellSignals: signals.filter(s => s.signalType === 'SELL').length,
        holdSignals: signals.filter(s => s.signalType === 'HOLD').length
      },
      signals: signals.map(signal => ({
        symbol: signal.symbol,
        name: signal.name,
        signalType: signal.signalType,
        currentPrice: signal.currentPrice,
        confidence: signal.confidence || 'medium',
        action: signal.recommendedAction?.action || 'HOLD',
        quantity: signal.recommendedAction?.quantity || 0,
        riskAmount: signal.recommendedAction?.riskAmount || 0,
        reasoning: signal.recommendedAction?.reasoning || '',
        timestamp: signal.timestamp || new Date().toISOString()
      })),
      metadata: {
        requestedBy: 'make.com',
        analysisType: 'turtle_trading',
        market: 'KRX',
        apiVersion: '1.0'
      }
    };
    
    res.json(analysisResult);
    
  } catch (error) {
    console.error('Make.com 신호분석 실패:', error);
    res.status(500).json({
      success: false,
      error: 'ANALYSIS_FAILED',
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