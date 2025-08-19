require('dotenv').config();
const KiwoomService = require('./services/kiwoomService');
const axios = require('axios');

// 키움 일별주가 조회 API 테스트 (ka10086)
async function testKiwoomDailyPrice() {
  console.log('🧪 키움 일별주가 조회 API 테스트');
  console.log('==============================');
  
  try {
    // 키움 인증
    const authSuccess = await KiwoomService.authenticate(process.env.KIWOOM_APP_KEY, process.env.KIWOOM_SECRET_KEY);
    
    if (!authSuccess) {
      throw new Error('키움 인증 실패');
    }
    
    console.log('✅ 키움 인증 성공');
    
    // 테스트할 종목들
    const testStocks = [
      { symbol: '214450', name: '파마리서치', expectedPrice: 668000 },
      { symbol: '005930', name: '삼성전자', expectedPrice: 70000 }
    ];
    
    // 오늘 날짜 (YYYYMMDD)
    const today = new Date();
    const queryDate = today.getFullYear().toString() + 
                     (today.getMonth() + 1).toString().padStart(2, '0') + 
                     today.getDate().toString().padStart(2, '0');
    
    console.log(`📅 조회 날짜: ${queryDate}`);
    
    for (const stock of testStocks) {
      console.log(`\n--- ${stock.name} (${stock.symbol}) ---`);
      
      try {
        // 키움 일별주가 조회 API
        const response = await axios.post('https://api.kiwoom.com/api/dostk/mrkcond', {
          stk_cd: stock.symbol, // 종목코드
          qry_dt: queryDate, // 조회일자
          indc_tp: '0' // 표시구분 0:수량, 1:금액
        }, {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'authorization': `Bearer ${KiwoomService.accessToken}`,
            'cont-yn': 'N',
            'next-key': '',
            'api-id': 'ka10086'
          },
          timeout: 10000
        });
        
        console.log('응답 코드:', response.data.return_code);
        console.log('응답 메시지:', response.data.return_msg);
        
        if (response.data.return_code === 0) {
          console.log('✅ 조회 성공');
          console.log('응답 데이터:', JSON.stringify(response.data, null, 2));
          
          // 가격 정보 추출 시도
          const output = response.data.output;
          if (output) {
            console.log('Output 데이터:', JSON.stringify(output, null, 2));
          }
        } else {
          console.log('❌ 조회 실패:', response.data.return_msg);
        }
        
      } catch (error) {
        console.log('❌ API 호출 실패:', error.response?.data || error.message);
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n💡 결론:');
    console.log('키움 일별주가 API로 정확한 당일 종가 조회 가능하면');
    console.log('Yahoo Finance 대신 키움 API 사용으로 전환');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
}

testKiwoomDailyPrice().then(() => {
  console.log('\n✅ 키움 일별주가 테스트 완료');
  process.exit(0);
}).catch(error => {
  console.error('❌ 실패:', error);
  process.exit(1);
});