/**
 * 종목명 관리 API 엔드포인트
 * 전체 상장사 데이터 수집 및 업데이트용
 */

const express = require('express');
const router = express.Router();
const StockNameCacheService = require('../services/stockNameCacheService');

// 전체 상장사 데이터 업데이트 (DART API 사용)
router.post('/update-all', async (req, res) => {
  try {
    console.log('🚀 전체 상장사 데이터 업데이트 API 호출...');
    
    const result = await StockNameCacheService.updateAllListedCompanies();
    
    res.json({
      success: true,
      message: '전체 상장사 데이터 업데이트 완료',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 전체 상장사 데이터 업데이트 API 실패:', error);
    
    res.status(500).json({
      success: false,
      message: '전체 상장사 데이터 업데이트 실패',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 기본 종목명 데이터 구축 (하드코딩된 주요 종목)
router.post('/populate', async (req, res) => {
  try {
    console.log('🚀 기본 종목명 데이터 구축 API 호출...');
    
    const result = await StockNameCacheService.populateStockNames();
    
    res.json({
      success: true,
      message: '기본 종목명 데이터 구축 완료',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 기본 종목명 데이터 구축 API 실패:', error);
    
    res.status(500).json({
      success: false,
      message: '기본 종목명 데이터 구축 실패',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 종목명 캐시 통계 조회
router.get('/stats', async (req, res) => {
  try {
    const stats = await StockNameCacheService.getCacheStats();
    
    res.json({
      success: true,
      message: '종목명 캐시 통계 조회 완료',
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 종목명 캐시 통계 조회 실패:', error);
    
    res.status(500).json({
      success: false,
      message: '종목명 캐시 통계 조회 실패',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 개별 종목명 조회 테스트
router.get('/test/:stockCode', async (req, res) => {
  try {
    const { stockCode } = req.params;
    const stockName = await StockNameCacheService.getStockName(stockCode);
    
    res.json({
      success: true,
      data: {
        stockCode,
        stockName
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ 종목명 조회 테스트 실패 (${req.params.stockCode}):`, error);
    
    res.status(500).json({
      success: false,
      message: '종목명 조회 실패',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 메모리 캐시 초기화
router.post('/clear-cache', async (req, res) => {
  try {
    StockNameCacheService.memoryCache.clear();
    
    res.json({
      success: true,
      message: '메모리 캐시 초기화 완료',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '메모리 캐시 초기화 실패',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;