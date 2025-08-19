const axios = require('axios');
require('dotenv').config();

// DART 다중회사 주요계정 API 테스트
async function testMultiAcnt() {
  const apiKey = process.env.DART_API_KEY;
  
  console.log('🧪 DART 다중회사 주요계정 API 테스트');
  console.log('===========================================');
  
  try {
    // 삼성전자 2024년 사업보고서
    const response = await axios.get('https://opendart.fss.or.kr/api/fnlttMultiAcnt.json', {
      params: {
        crtfc_key: apiKey,
        corp_code: '00126380', // 삼성전자
        bsns_year: '2024',
        reprt_code: '11011' // 사업보고서
      },
      timeout: 10000
    });
    
    console.log(`✅ API 응답: ${response.data.status} - ${response.data.message}`);
    console.log(`📊 데이터 개수: ${response.data.list?.length || 0}개`);
    
    if (response.data.list && response.data.list.length > 0) {
      console.log('\n📋 매출액 관련 계정 찾기:');
      
      const revenueAccounts = response.data.list.filter(item => 
        item.account_nm.includes('매출') || 
        item.account_nm.includes('수익')
      );
      
      revenueAccounts.forEach(item => {
        console.log(`- ${item.account_nm} (${item.sj_nm})`);
        console.log(`  당기: ${item.thstrm_amount} (${item.thstrm_nm})`);
        console.log(`  전기: ${item.frmtrm_amount} (${item.frmtrm_nm})`);
        if (item.bfefrmtrm_amount) {
          console.log(`  전전기: ${item.bfefrmtrm_amount} (${item.bfefrmtrm_nm})`);
        }
        console.log(`  통화: ${item.currency}`);
        console.log('');
      });
      
      console.log('\n📋 순이익 관련 계정 찾기:');
      
      const netIncomeAccounts = response.data.list.filter(item => 
        item.account_nm.includes('당기순이익') || 
        item.account_nm.includes('순이익')
      );
      
      netIncomeAccounts.forEach(item => {
        console.log(`- ${item.account_nm} (${item.sj_nm})`);
        console.log(`  당기: ${item.thstrm_amount} (${item.thstrm_nm})`);
        console.log(`  전기: ${item.frmtrm_amount} (${item.frmtrm_nm})`);
        if (item.bfefrmtrm_amount) {
          console.log(`  전전기: ${item.bfefrmtrm_amount} (${item.bfefrmtrm_nm})`);
        }
        console.log(`  통화: ${item.currency}`);
        console.log('');
      });
      
      console.log('\n💡 3개년 성장률 계산 예시:');
      
      // 매출액으로 성장률 계산
      const revenue = revenueAccounts.find(item => item.account_nm === '매출액');
      if (revenue) {
        const current = parseInt(revenue.thstrm_amount?.replace(/,/g, '') || '0');
        const previous = parseInt(revenue.frmtrm_amount?.replace(/,/g, '') || '0');
        const beforePrevious = parseInt(revenue.bfefrmtrm_amount?.replace(/,/g, '') || '0');
        
        console.log(`매출액 추이: ${beforePrevious.toLocaleString()} → ${previous.toLocaleString()} → ${current.toLocaleString()}`);
        
        if (beforePrevious > 0) {
          const growthRate = (Math.pow(current / beforePrevious, 1/2) - 1) * 100;
          console.log(`매출 성장률 (2년): ${growthRate.toFixed(2)}%`);
        }
      }
      
      // 순이익으로 성장률 계산
      const netIncome = netIncomeAccounts.find(item => item.account_nm === '당기순이익');
      if (netIncome) {
        const current = parseInt(netIncome.thstrm_amount?.replace(/,/g, '') || '0');
        const previous = parseInt(netIncome.frmtrm_amount?.replace(/,/g, '') || '0');
        const beforePrevious = parseInt(netIncome.bfefrmtrm_amount?.replace(/,/g, '') || '0');
        
        console.log(`순이익 추이: ${beforePrevious.toLocaleString()} → ${previous.toLocaleString()} → ${current.toLocaleString()}`);
        
        if (beforePrevious > 0) {
          const growthRate = (Math.pow(current / beforePrevious, 1/2) - 1) * 100;
          console.log(`순이익 성장률 (2년): ${growthRate.toFixed(2)}%`);
        }
      }
      
      console.log('\n📊 API 장점 분석:');
      console.log('✅ 한 번 호출로 3개년 데이터 획득');
      console.log('✅ 전년도/전전년도 자동 포함');
      console.log('✅ 더 적은 API 호출로 Rate Limit 절약');
      console.log('✅ 통화 단위 정보 제공');
      
    } else {
      console.log('❌ 데이터 없음');
    }
    
  } catch (error) {
    console.error('❌ API 호출 실패:', error.response?.data || error.message);
  }
}

// SK하이닉스도 테스트
async function testMultipleCompanies() {
  console.log('\n🔄 여러 회사 테스트');
  console.log('==================');
  
  const companies = [
    { code: '00164779', name: 'SK하이닉스' },
    { code: '00593624', name: 'NAVER' }
  ];
  
  for (const company of companies) {
    console.log(`\n--- ${company.name} ---`);
    
    try {
      const response = await axios.get('https://opendart.fss.or.kr/api/fnlttMultiAcnt.json', {
        params: {
          crtfc_key: process.env.DART_API_KEY,
          corp_code: company.code,
          bsns_year: '2024',
          reprt_code: '11011'
        },
        timeout: 5000
      });
      
      if (response.data.status === '000') {
        const revenue = response.data.list?.find(item => item.account_nm === '매출액');
        const netIncome = response.data.list?.find(item => item.account_nm === '당기순이익');
        
        if (revenue) {
          const current = parseInt(revenue.thstrm_amount?.replace(/,/g, '') || '0') / 100000000;
          console.log(`✅ 매출액: ${current.toLocaleString()}억원`);
        }
        
        if (netIncome) {
          const current = parseInt(netIncome.thstrm_amount?.replace(/,/g, '') || '0') / 100000000;
          console.log(`✅ 순이익: ${current.toLocaleString()}억원`);
        }
        
      } else {
        console.log(`❌ ${response.data.message}`);
      }
      
    } catch (error) {
      console.log(`❌ 오류: ${error.message}`);
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function runTests() {
  await testMultiAcnt();
  await testMultipleCompanies();
  
  console.log('\n✅ Multi Account API 테스트 완료');
  console.log('🎯 결론: 이 API를 사용하면 더 효율적인 데이터 수집 가능!');
  
  process.exit(0);
}

runTests().catch(error => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});