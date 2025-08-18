const express = require('express');
const router = express.Router();
const KiwoomService = require('../services/kiwoomService');

// 키움 API 연결 테스트
router.post('/connect', async (req, res) => {
  try {
    const { accountNumber, appKey, secretKey } = req.body;
    
    const success = await KiwoomService.connect(accountNumber, appKey, secretKey);
    
    res.json({
      success: success,
      message: success ? '키움 API 연결 성공' : '연결 실패 - 시뮬레이션 모드',
      isConnected: KiwoomService.isConnectedToKiwoom()
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '연결 시도 중 오류 발생',
      error: error.message 
    });
  }
});

// 현재가 조회 테스트
router.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await KiwoomService.getCurrentPrice(symbol);
    
    res.json({
      success: true,
      symbol: symbol,
      price: price,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '가격 조회 실패',
      error: error.message 
    });
  }
});

// 일봉 데이터 조회 테스트  
router.get('/daily/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 20 } = req.query;
    
    const data = await KiwoomService.getDailyData(symbol, parseInt(days));
    
    res.json({
      success: true,
      symbol: symbol,
      days: data.length,
      data: data,
      latest: data[data.length - 1] || null
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '일봉 데이터 조회 실패',
      error: error.message 
    });
  }
});

// 계좌 정보 조회
router.get('/account/:accountNumber?', async (req, res) => {
  try {
    const balance = await KiwoomService.getAccountBalance();
    
    res.json({
      success: true,
      account: balance,
      isConnected: KiwoomService.isConnectedToKiwoom()
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: '계좌 조회 실패',
      error: error.message 
    });
  }
});

module.exports = router;