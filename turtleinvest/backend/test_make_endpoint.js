const express = require('express');
const SuperstocksAnalyzer = require('./services/superstocksAnalyzer');
const SlackMessageFormatter = require('./services/slackMessageFormatter');
require('dotenv').config();

// Make.com API 엔드포인트 직접 테스트
async function testMakeEndpoint() {
  console.log('🧪 Make.com API 엔드포인트 시뮬레이션');
  console.log('=====================================');
  
  try {
    // SK하이닉스만으로 테스트
    const testStocks = ['000660'];
    
    console.log('📊 슈퍼스톡스 분석 실행...');
    const superstocks = await SuperstocksAnalyzer.analyzeSuperstocks(testStocks);
    
    console.log('\n📋 superstocks 원본 데이터:');
    superstocks.forEach((stock, index) => {
      console.log(`--- Stock ${index + 1} ---`);
      console.log('symbol:', stock.symbol);
      console.log('name:', stock.name);
      console.log('psr:', stock.psr);
      console.log('psr 타입:', typeof stock.psr);
      console.log('revenueGrowth3Y:', stock.revenueGrowth3Y);
      console.log('netIncomeGrowth3Y:', stock.netIncomeGrowth3Y);
      console.log('meetsConditions:', stock.meetsConditions);
    });
    
    // qualifiedStocks 필터링 (API에서 하는 방식)
    const qualifiedStocks = superstocks.filter(s => s && s.meetsConditions);
    
    console.log('\n🎯 Qualified Stocks 필터링:');
    console.log('필터링 조건: s && s.meetsConditions');
    console.log('결과 개수:', qualifiedStocks.length);
    
    // Make.com 응답에서 qualifiedStocks 매핑 (API 라인 179-188)
    const apiQualifiedStocks = qualifiedStocks.map(stock => ({
      symbol: stock.symbol,
      name: stock.name,
      currentPrice: stock.currentPrice,
      revenueGrowth3Y: stock.revenueGrowth3Y,
      netIncomeGrowth3Y: stock.netIncomeGrowth3Y,
      psr: stock.psr,
      score: stock.score,
      dataSource: stock.dataSource
    }));
    
    console.log('\n📤 API 응답의 qualifiedStocks:');
    apiQualifiedStocks.forEach((stock, index) => {
      console.log(`--- API Qualified Stock ${index + 1} ---`);
      console.log('symbol:', stock.symbol);
      console.log('name:', stock.name);
      console.log('psr:', stock.psr);
      console.log('psr 타입:', typeof stock.psr);
      console.log('revenueGrowth3Y:', stock.revenueGrowth3Y);
      console.log('netIncomeGrowth3Y:', stock.netIncomeGrowth3Y);
    });
    
    // Slack 메시지 포맷팅에서도 확인
    console.log('\n📱 Slack 메시지 포맷팅 테스트:');
    const slackFormatData = {
      timestamp: new Date().toISOString(),
      summary: {
        qualifiedSuperstocks: qualifiedStocks.length
      },
      superstocks: {
        qualifiedStocks: apiQualifiedStocks
      }
    };
    
    const slackMessage = SlackMessageFormatter.formatIntegratedAnalysis(slackFormatData);
    
    // Slack 메시지에서 PSR 부분만 추출
    const psrMatches = slackMessage.match(/PSR: [\d.]+/g);
    console.log('Slack 메시지의 PSR 값들:', psrMatches);
    
    console.log('\n✅ Make.com API 테스트 완료');
    console.log(`🎯 Qualified Stocks PSR: ${apiQualifiedStocks.map(s => s.psr).join(', ')}`);
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testMakeEndpoint().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ 실패:', error);
  process.exit(1);
});