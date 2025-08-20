/**
 * API 엔드포인트 테스트 스크립트
 * 400 Bad Request 에러 디버깅용
 */

const axios = require('axios');

// 테스트 설정
const BASE_URL = 'http://localhost:3001/api/signals';
const API_KEY = 'TtL_9K2m8X7nQ4pE6wR3vY5uI8oP1aSdF7gH9jK2mN5vB8xC3zE6rT9yU4iO7pL0';

async function testHealthCheck() {
  console.log('\n🔍 헬스체크 테스트...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 헬스체크 성공:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 헬스체크 실패:', error.response?.data || error.message);
    return false;
  }
}

async function testSuperstocksSearch() {
  console.log('\n🚀 슈퍼스톡스 검색 API 테스트...');
  
  const testData = {
    apiKey: API_KEY,
    conditions: {
      minRevenueGrowth: 15,
      minNetIncomeGrowth: 15,
      maxPSR: 0.75
    }
  };

  console.log('📨 요청 데이터:', JSON.stringify(testData, null, 2));

  try {
    const response = await axios.post(`${BASE_URL}/superstocks-search`, testData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 60000 // 60초 타임아웃
    });

    console.log('✅ 슈퍼스톡스 검색 성공:');
    console.log(`   처리시간: ${response.data.processingTime}`);
    console.log(`   분석 종목: ${response.data.summary?.totalAnalyzed || 0}개`);
    console.log(`   조건 만족: ${response.data.summary?.qualifiedStocks || 0}개`);
    
    return true;
  } catch (error) {
    console.error('❌ 슈퍼스톡스 검색 실패:');
    
    if (error.response) {
      console.error(`   상태코드: ${error.response.status}`);
      console.error(`   응답 헤더:`, error.response.headers);
      console.error(`   응답 데이터:`, error.response.data);
    } else if (error.request) {
      console.error('   요청은 전송되었으나 응답 없음');
      console.error('   요청:', error.request);
    } else {
      console.error('   에러:', error.message);
    }
    
    return false;
  }
}

async function testTurtleAnalysis() {
  console.log('\n🐢 터틀 분석 API 테스트...');
  
  try {
    const response = await axios.post(`${BASE_URL}/analyze`, {}, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ 터틀 분석 성공:');
    console.log(`   신호 개수: ${response.data.signals?.length || 0}개`);
    
    return true;
  } catch (error) {
    console.error('❌ 터틀 분석 실패:', error.response?.data || error.message);
    return false;
  }
}

async function testMakeIntegration() {
  console.log('\n🔧 Make.com 통합 분석 테스트...');
  
  const testData = {
    apiKey: API_KEY,
    investmentBudget: 1000000
  };

  try {
    const response = await axios.post(`${BASE_URL}/make-analysis`, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    console.log('✅ 통합 분석 성공:');
    console.log(`   터틀 신호: ${response.data.summary?.turtleSignals || 0}개`);
    console.log(`   슈퍼스톡스: ${response.data.summary?.qualifiedSuperstocks || 0}개`);
    
    return true;
  } catch (error) {
    console.error('❌ 통합 분석 실패:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 TurtleInvest API 엔드포인트 테스트 시작');
  console.log('=' .repeat(50));
  
  const results = [];
  
  // 1. 헬스체크
  results.push(await testHealthCheck());
  
  // 2. 슈퍼스톡스 검색 (메인 테스트)
  results.push(await testSuperstocksSearch());
  
  // 3. 터틀 분석
  results.push(await testTurtleAnalysis());
  
  // 4. Make.com 통합
  results.push(await testMakeIntegration());
  
  // 결과 요약
  console.log('\n📊 테스트 결과 요약');
  console.log('=' .repeat(50));
  
  const passCount = results.filter(r => r === true).length;
  const totalCount = results.length;
  
  console.log(`✅ 통과: ${passCount}/${totalCount}`);
  console.log(`❌ 실패: ${totalCount - passCount}/${totalCount}`);
  
  if (passCount === totalCount) {
    console.log('🎉 모든 테스트 통과!');
  } else {
    console.log('⚠️ 일부 테스트 실패. 서버 로그를 확인하세요.');
  }
}

// 개별 테스트 실행 옵션
const testType = process.argv[2];

switch (testType) {
  case 'health':
    testHealthCheck();
    break;
  case 'superstocks':
    testSuperstocksSearch();
    break;
  case 'turtle':
    testTurtleAnalysis();
    break;
  case 'make':
    testMakeIntegration();
    break;
  default:
    runAllTests();
}