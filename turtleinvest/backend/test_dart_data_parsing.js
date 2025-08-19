const axios = require('axios');
require('dotenv').config();

// DART API 데이터 파싱 테스트
async function testDataParsing() {
  const apiKey = process.env.DART_API_KEY;
  
  console.log('🧪 DART 재무데이터 파싱 테스트');
  
  try {
    // 2024년 삼성전자 재무제표 조회
    const response = await axios.get('https://opendart.fss.or.kr/api/fnlttSinglAcnt.json', {
      params: {
        crtfc_key: apiKey,
        corp_code: '00126380', // 삼성전자
        bsns_year: '2024',
        reprt_code: '11011',
        fs_div: 'CFS'
      }
    });
    
    console.log(`✅ API 응답: ${response.data.status} - ${response.data.message}`);
    console.log(`📊 데이터 개수: ${response.data.list.length}개`);
    
    // 모든 계정과목 출력
    console.log('\n📋 전체 계정과목 리스트:');
    response.data.list.forEach((item, index) => {
      console.log(`${index + 1}. ${item.account_nm}: ${item.thstrm_amount}`);
    });
    
    // 현재 파싱 로직 테스트
    console.log('\n🔍 현재 파싱 로직으로 추출된 데이터:');
    const result = {
      revenue: 0,
      netIncome: 0,
      operatingIncome: 0,
      totalAssets: 0,
      totalEquity: 0
    };
    
    response.data.list.forEach(item => {
      const accountName = item.account_nm;
      const amount = parseInt(item.thstrm_amount?.replace(/,/g, '') || '0');
      
      console.log(`검사중: "${accountName}" = ${amount.toLocaleString()}`);
      
      // 매출액 (수익인식기준) - DART는 백만원 단위
      if (accountName.includes('수익(매출액)') || accountName.includes('매출액')) {
        result.revenue = amount / 100; // 백만원 → 억원 변환
        console.log(`  ✅ 매출액 매칭: ${result.revenue.toLocaleString()}억원`);
      }
      // 당기순이익 - DART는 백만원 단위
      else if (accountName.includes('당기순이익') || accountName.includes('순이익')) {
        result.netIncome = amount / 100; // 백만원 → 억원 변환
        console.log(`  ✅ 순이익 매칭: ${result.netIncome.toLocaleString()}억원`);
      }
      // 영업이익 - DART는 백만원 단위
      else if (accountName.includes('영업이익')) {
        result.operatingIncome = amount / 100; // 백만원 → 억원 변환
        console.log(`  ✅ 영업이익 매칭: ${result.operatingIncome.toLocaleString()}억원`);
      }
      // 총자산 - DART는 백만원 단위
      else if (accountName.includes('자산총계') || accountName.includes('총자산')) {
        result.totalAssets = amount / 100; // 백만원 → 억원 변환
        console.log(`  ✅ 총자산 매칭: ${result.totalAssets.toLocaleString()}억원`);
      }
      // 자본총계 - DART는 백만원 단위
      else if (accountName.includes('자본총계') || accountName.includes('총자본')) {
        result.totalEquity = amount / 100; // 백만원 → 억원 변환
        console.log(`  ✅ 자본총계 매칭: ${result.totalEquity.toLocaleString()}억원`);
      }
    });
    
    console.log('\n📊 최종 파싱 결과:');
    console.log(`   매출액: ${result.revenue.toLocaleString()}억원`);
    console.log(`   순이익: ${result.netIncome.toLocaleString()}억원`);
    console.log(`   영업이익: ${result.operatingIncome.toLocaleString()}억원`);
    console.log(`   총자산: ${result.totalAssets.toLocaleString()}억원`);
    console.log(`   자본총계: ${result.totalEquity.toLocaleString()}억원`);
    
    // 개선된 파싱 로직 제안
    console.log('\n💡 개선된 파싱 로직 테스트:');
    const improvedResult = {
      revenue: 0,
      netIncome: 0,
      operatingIncome: 0,
      totalAssets: 0,
      totalEquity: 0
    };
    
    response.data.list.forEach(item => {
      const accountName = item.account_nm;
      const amount = parseInt(item.thstrm_amount?.replace(/,/g, '') || '0');
      
      // 더 정확한 매칭 조건
      if (accountName === '수익(매출액)' || accountName === '매출액' || accountName.includes('수익(매출액)')) {
        improvedResult.revenue = amount / 100;
        console.log(`  ✅ 매출액: "${accountName}" = ${improvedResult.revenue.toLocaleString()}억원`);
      }
      else if (accountName.includes('지배기업') && accountName.includes('당기순이익')) {
        improvedResult.netIncome = amount / 100;
        console.log(`  ✅ 순이익: "${accountName}" = ${improvedResult.netIncome.toLocaleString()}억원`);
      }
      else if (accountName === '영업이익' || (accountName.includes('영업') && accountName.includes('이익'))) {
        improvedResult.operatingIncome = amount / 100;
        console.log(`  ✅ 영업이익: "${accountName}" = ${improvedResult.operatingIncome.toLocaleString()}억원`);
      }
      else if (accountName === '자산총계') {
        improvedResult.totalAssets = amount / 100;
        console.log(`  ✅ 총자산: "${accountName}" = ${improvedResult.totalAssets.toLocaleString()}억원`);
      }
      else if (accountName === '자본총계') {
        improvedResult.totalEquity = amount / 100;
        console.log(`  ✅ 자본총계: "${accountName}" = ${improvedResult.totalEquity.toLocaleString()}억원`);
      }
    });
    
    console.log('\n📊 개선된 파싱 결과:');
    console.log(`   매출액: ${improvedResult.revenue.toLocaleString()}억원`);
    console.log(`   순이익: ${improvedResult.netIncome.toLocaleString()}억원`);
    console.log(`   영업이익: ${improvedResult.operatingIncome.toLocaleString()}억원`);
    console.log(`   총자산: ${improvedResult.totalAssets.toLocaleString()}억원`);
    console.log(`   자본총계: ${improvedResult.totalEquity.toLocaleString()}억원`);
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
}

testDataParsing().then(() => {
  console.log('\n✅ 데이터 파싱 테스트 완료');
  process.exit(0);
}).catch(error => {
  console.error('❌ 실패:', error);
  process.exit(1);
});