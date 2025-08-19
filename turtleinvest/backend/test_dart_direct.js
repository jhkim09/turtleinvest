const axios = require('axios');
require('dotenv').config();

// DART API 직접 테스트 (공식 문서 방식)
async function testDartDirect() {
  const apiKey = process.env.DART_API_KEY;
  console.log(`🔑 DART API Key: ${apiKey}`);
  
  try {
    console.log('\n1. 기업개요 API 테스트...');
    
    // 삼성전자 기업개요 조회 (종목코드로 직접)
    const response1 = await axios.get('https://opendart.fss.or.kr/api/company.json', {
      params: {
        crtfc_key: apiKey,
        corp_code: '00126380'  // 삼성전자 기업코드
      }
    });
    
    console.log('삼성전자 기업개요:', JSON.stringify(response1.data, null, 2));
    
  } catch (error) {
    console.error('기업개요 API 오류:', error.response?.data || error.message);
  }
  
  try {
    console.log('\n2. 기업코드 다운로드 API 테스트...');
    
    // 기업코드 다운로드
    const response2 = await axios.get('https://opendart.fss.or.kr/api/corpCode.xml', {
      params: {
        crtfc_key: apiKey
      },
      responseType: 'arraybuffer'
    });
    
    const dataSize = response2.data.length;
    console.log(`기업코드 파일 크기: ${dataSize} bytes`);
    
    // 처음 500바이트만 확인
    const textSample = response2.data.toString().substring(0, 500);
    console.log('파일 내용 샘플:', textSample);
    
  } catch (error) {
    console.error('기업코드 다운로드 API 오류:', error.response?.data || error.message);
  }
  
  try {
    console.log('\n3. 공시정보 API 테스트...');
    
    // 최근 공시정보 조회
    const today = new Date();
    const endDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    const startDate = new Date(today.getTime() - 7*24*60*60*1000).toISOString().slice(0, 10).replace(/-/g, '');
    
    const response3 = await axios.get('https://opendart.fss.or.kr/api/list.json', {
      params: {
        crtfc_key: apiKey,
        corp_code: '00126380', // 삼성전자
        bgn_de: startDate,
        end_de: endDate,
        page_no: 1,
        page_count: 10
      }
    });
    
    console.log('최근 공시정보:', JSON.stringify(response3.data, null, 2));
    
  } catch (error) {
    console.error('공시정보 API 오류:', error.response?.data || error.message);
  }
}

testDartDirect().then(() => {
  console.log('\n✅ DART API 직접 테스트 완료');
  process.exit(0);
}).catch(error => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});