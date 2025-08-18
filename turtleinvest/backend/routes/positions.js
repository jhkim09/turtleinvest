const express = require('express');
const mongoose = require('mongoose');
const Portfolio = require('../models/Portfolio');
const KiwoomService = require('../services/kiwoomService');
const router = express.Router();

// 포트폴리오 조회 (포지션 포함)
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    
    // MongoDB 연결 실패시 더미 데이터 반환
    if (!mongoose.connection.readyState) {
      return res.json({
        success: true,
        portfolio: {
          userId: userId,
          currentCash: 50000000,
          totalEquity: 50000000,
          portfolioValue: 50000000,
          totalReturn: 0,
          currentRiskExposure: 0,
          positions: [],
          riskSettings: {
            maxRiskPerTrade: 0.02,
            maxTotalRisk: 0.10,
            minCashReserve: 0.20
          },
          stats: {
            totalTrades: 0,
            winningTrades: 0,
            totalProfit: 0,
            totalLoss: 0,
            largestWin: 0,
            largestLoss: 0,
            winRate: 0,
            profitFactor: 0
          }
        },
        message: 'MongoDB 연결 대기중 - 임시 데이터'
      });
    }
    
    let portfolio = await Portfolio.findOne({ userId });
    
    if (!portfolio) {
      portfolio = new Portfolio({
        userId,
        initialBalance: 50000000,
        currentCash: 50000000,
        totalEquity: 50000000,
        positions: []
      });
      await portfolio.save();
    }

    // 키움 계좌 정보로 실제 총자산 업데이트
    let kiwoomAccountData = null;
    let displayPortfolio = { ...portfolio.toObject() }; // MongoDB 데이터를 기본값으로
    
    try {
      if (KiwoomService.isConnectedToKiwoom()) {
        kiwoomAccountData = await KiwoomService.getAccountBalance();
        if (kiwoomAccountData) {
          // MongoDB에 저장
          portfolio.currentCash = kiwoomAccountData.cash;
          portfolio.totalEquity = kiwoomAccountData.totalAsset;
          portfolio.portfolioValue = kiwoomAccountData.totalAsset;
          await portfolio.save();
          
          // 응답에도 즉시 반영
          displayPortfolio.currentCash = kiwoomAccountData.cash;
          displayPortfolio.totalEquity = kiwoomAccountData.totalAsset;
          displayPortfolio.portfolioValue = kiwoomAccountData.totalAsset;
          displayPortfolio.positions = kiwoomAccountData.positions || [];
          
          console.log(`💰 실제 키움 데이터 반영: 총자산 ${kiwoomAccountData.totalAsset.toLocaleString()}원`);
        }
      }
    } catch (error) {
      console.log('키움 계좌 정보 조회 실패:', error.message);
    }
    
    res.json({
      success: true,
      portfolio: {
        userId: displayPortfolio.userId,
        currentCash: displayPortfolio.currentCash,
        totalEquity: displayPortfolio.totalEquity,
        portfolioValue: displayPortfolio.portfolioValue,
        totalReturn: displayPortfolio.totalReturn,
        currentRiskExposure: displayPortfolio.currentRiskExposure,
        positions: displayPortfolio.positions,
        riskSettings: displayPortfolio.riskSettings,
        stats: displayPortfolio.stats
      },
      kiwoomConnected: KiwoomService.isConnectedToKiwoom(),
      message: kiwoomAccountData ? `키움 실계좌 연동: ${kiwoomAccountData.totalAsset.toLocaleString()}원` : '시뮬레이션 모드'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 포지션 추가/수정
router.post('/', async (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    const positionData = req.body;
    
    let portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) {
      return res.status(404).json({ success: false, message: '포트폴리오를 찾을 수 없습니다' });
    }
    
    // 기존 포지션 찾기
    const existingPosition = portfolio.positions.find(p => p.symbol === positionData.symbol);
    
    if (existingPosition) {
      // 포지션 업데이트
      Object.assign(existingPosition, positionData);
    } else {
      // 새 포지션 추가
      portfolio.positions.push({
        symbol: positionData.symbol,
        name: positionData.name,
        quantity: positionData.quantity,
        avgPrice: positionData.avgPrice,
        currentPrice: positionData.currentPrice || positionData.avgPrice,
        stopLossPrice: positionData.stopLossPrice,
        entryDate: positionData.entryDate || new Date(),
        entrySignal: positionData.entrySignal || '20day_breakout',
        atr: positionData.atr,
        riskAmount: positionData.riskAmount,
        unrealizedPL: 0
      });
    }
    
    await portfolio.save();
    
    res.json({
      success: true,
      portfolio: portfolio,
      message: '포지션이 성공적으로 업데이트되었습니다'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 포지션 삭제
router.delete('/:symbol', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const symbol = req.params.symbol;
    
    const portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) {
      return res.status(404).json({ success: false, message: '포트폴리오를 찾을 수 없습니다' });
    }
    
    portfolio.positions = portfolio.positions.filter(p => p.symbol !== symbol);
    await portfolio.save();
    
    res.json({
      success: true,
      message: `${symbol} 포지션이 삭제되었습니다`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;