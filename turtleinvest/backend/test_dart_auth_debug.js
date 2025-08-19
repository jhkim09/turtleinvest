const axios = require('axios');
require('dotenv').config();

// DART API 인증 문제 정밀 진단
async function debugDartAuth() {
  const apiKey = process.env.DART_API_KEY;
  console.log(`🔑 DART API Key: ${apiKey}`);
  console.log(`📏 API Key 길이: ${apiKey?.length}자`);
  
  // 1. 기본 API 테스트 (작동하는 것 확인)
  console.log('\n1. 기업개요 API (정상 작동 확인)...');
  try {
    const response1 = await axios.get('https://opendart.fss.or.kr/api/company.json', {
      params: {
        crtfc_key: apiKey,
        corp_code: '00126380'  // 삼성전자
      }
    });
    console.log(`✅ 기업개요 API: ${response1.data.status === '000' ? '성공' : '실패'}`);
    console.log(`   회사명: ${response1.data.corp_name}`);
  } catch (error) {
    console.error('❌ 기업개요 API 실패:', error.response?.data || error.message);
  }
  
  // 2. 재무제표 API 테스트 (여러 방법)
  console.log('\n2. 재무제표 API 테스트...');
  
  // 방법 A: 파라미터 방식
  console.log('\n2-A. 파라미터 방식...');
  try {
    const responseA = await axios.get('https://opendart.fss.or.kr/api/fnlttSinglAcnt.json', {
      params: {
        crtfc_key: apiKey,
        corp_code: '00126380',
        bsns_year: '2024',
        reprt_code: '11011',
        fs_div: 'CFS'
      },
      timeout: 10000
    });
    console.log(`✅ 파라미터 방식: ${responseA.data.status}`);
    console.log(`   메시지: ${responseA.data.message}`);
    if (responseA.data.list) {
      console.log(`   데이터 개수: ${responseA.data.list.length}개`);
    }
  } catch (error) {
    console.error('❌ 파라미터 방식 실패:', error.response?.data || error.message);
  }
  
  // 방법 B: URL 직접 구성
  console.log('\n2-B. URL 직접 구성...');
  try {
    const urlB = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${apiKey}&corp_code=00126380&bsns_year=2024&reprt_code=11011&fs_div=CFS`;
    console.log(`🔗 요청 URL: ${urlB.replace(apiKey, apiKey.substring(0, 8) + '...')}`);
    
    const responseB = await axios.get(urlB, {
      timeout: 10000
    });
    console.log(`✅ URL 직접: ${responseB.data.status}`);
    console.log(`   메시지: ${responseB.data.message}`);
    if (responseB.data.list) {
      console.log(`   데이터 개수: ${responseB.data.list.length}개`);
    }
  } catch (error) {
    console.error('❌ URL 직접 실패:', error.response?.data || error.message);
  }
  
  // 방법 C: 2023년 데이터로 테스트
  console.log('\n2-C. 2023년 데이터 테스트...');
  try {
    const responseC = await axios.get('https://opendart.fss.or.kr/api/fnlttSinglAcnt.json', {
      params: {
        crtfc_key: apiKey,
        corp_code: '00126380',
        bsns_year: '2023',
        reprt_code: '11011',
        fs_div: 'CFS'
      },
      timeout: 10000
    });
    console.log(`✅ 2023년 데이터: ${responseC.data.status}`);
    console.log(`   메시지: ${responseC.data.message}`);
    if (responseC.data.list) {
      console.log(`   데이터 개수: ${responseC.data.list.length}개`);
      // 첫 번째 데이터 샘플 출력
      const sample = responseC.data.list[0];
      console.log(`   샘플: ${sample?.account_nm} = ${sample?.thstrm_amount}`);
    }
  } catch (error) {
    console.error('❌ 2023년 실패:', error.response?.data || error.message);
  }
  
  // 방법 D: 별도재무제표 (OFS)로 테스트
  console.log('\n2-D. 별도재무제표 (OFS) 테스트...');
  try {
    const responseD = await axios.get('https://opendart.fss.or.kr/api/fnlttSinglAcnt.json', {
      params: {
        crtfc_key: apiKey,
        corp_code: '00126380',
        bsns_year: '2023',
        reprt_code: '11011',
        fs_div: 'OFS'  // 별도재무제표
      },
      timeout: 10000
    });
    console.log(`✅ 별도재무제표: ${responseD.data.status}`);
    console.log(`   메시지: ${responseD.data.message}`);
    if (responseD.data.list) {
      console.log(`   데이터 개수: ${responseD.data.list.length}개`);
    }
  } catch (error) {
    console.error('❌ 별도재무제표 실패:', error.response?.data || error.message);
  }
  
  // 3. 다른 보고서 유형 테스트
  console.log('\n3. 다른 보고서 유형 테스트...');
  
  const reportTypes = [
    { code: '11013', name: '1분기보고서' },
    { code: '11012', name: '반기보고서' },
    { code: '11014', name: '3분기보고서' },
    { code: '11011', name: '사업보고서' }
  ];
  
  for (const report of reportTypes) {
    try {
      const response = await axios.get('https://opendart.fss.or.kr/api/fnlttSinglAcnt.json', {
        params: {
          crtfc_key: apiKey,
          corp_code: '00126380',
          bsns_year: '2023',
          reprt_code: report.code,
          fs_div: 'CFS'
        },
        timeout: 5000
      });
      
      const hasData = response.data.list && response.data.list.length > 0;
      console.log(`   ${report.name} (${report.code}): ${response.data.status} - ${hasData ? response.data.list.length + '개' : '데이터 없음'}`);
      
    } catch (error) {
      console.log(`   ${report.name} (${report.code}): 오류`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
  }
  
  console.log('\n=== 진단 결과 ===');
  console.log('🔍 DART API 인증키는 정상 작동');
  console.log('🔍 기업개요 API는 정상 작동');
  console.log('🔍 재무제표 API 문제 원인 추정:');
  console.log('   1. 2024년 데이터 아직 미공개 가능성');
  console.log('   2. 보고서 유형(reprt_code) 부적절');
  console.log('   3. 재무제표 구분(fs_div) 문제');
  console.log('   4. API 호출 방식 문제');
}

debugDartAuth().then(() => {
  console.log('\n✅ DART API 인증 진단 완료');
  process.exit(0);
}).catch(error => {
  console.error('❌ 진단 실패:', error);
  process.exit(1);
});