const express = require('express');
const Trade = require('../models/Trade');
const KiwoomService = require('../services/kiwoomService');
const router = express.Router();

// 거래 기록 조회
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const limit = parseInt(req.query.limit) || 50;
    
    // MongoDB에서 거래 기록 조회
    const trades = await Trade.find({ userId })
      .sort({ executedAt: -1 })
      .limit(limit);
    
    // 통계 계산
    const stats = {
      totalTrades: trades.length,
      winningTrades: trades.filter(t => t.realizedPL > 0).length,
      totalProfit: trades.filter(t => t.realizedPL > 0).reduce((sum, t) => sum + t.realizedPL, 0),
      totalLoss: Math.abs(trades.filter(t => t.realizedPL < 0).reduce((sum, t) => sum + t.realizedPL, 0)),
      largestWin: trades.length > 0 ? Math.max(...trades.map(t => t.realizedPL)) : 0,
      largestLoss: trades.length > 0 ? Math.abs(Math.min(...trades.map(t => t.realizedPL))) : 0
    };
    
    stats.winRate = stats.totalTrades > 0 ? (stats.winningTrades / stats.totalTrades * 100) : 0;
    stats.profitFactor = stats.totalLoss > 0 ? (stats.totalProfit / stats.totalLoss) : 0;
    
    res.json({
      success: true,
      trades: trades,
      stats: stats,
      kiwoomConnected: KiwoomService.isConnectedToKiwoom(),
      message: trades.length > 0 ? `${trades.length}개 거래기록 조회` : '거래기록이 없습니다'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 거래 기록 추가
router.post('/', async (req, res) => {
  try {
    const tradeData = req.body;
    const trade = new Trade(tradeData);
    await trade.save();
    
    res.json({
      success: true,
      trade: trade,
      message: '거래 기록이 저장되었습니다'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;