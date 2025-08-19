require('dotenv').config();
const KiwoomService = require('./services/kiwoomService');
const axios = require('axios');

// 키움 API 거래내역 조회 테스트
async function testKiwoomTrades() {
  console.log('🔍 키움 API 거래내역 조회 테스트');
  console.log('=============================');
  
  try {
    // 키움 인증
    const authSuccess = await KiwoomService.authenticate(process.env.KIWOOM_APP_KEY, process.env.KIWOOM_SECRET_KEY);
    
    if (!authSuccess) {
      throw new Error('키움 인증 실패');
    }
    
    console.log('✅ 키움 인증 성공');
    
    // 오늘 날짜
    const today = new Date();
    const queryDate = today.getFullYear().toString() + 
                     (today.getMonth() + 1).toString().padStart(2, '0') + 
                     today.getDate().toString().padStart(2, '0');
    
    console.log(`📅 조회 날짜: ${queryDate}`);
    
    // 1. 체결요청 API (ka10076) - 당일 체결내역
    console.log('\n1. 당일 체결내역 조회 (ka10076)...');
    try {
      const response1 = await axios.post('https://api.kiwoom.com/api/dostk/acnt', {
        qry_tp: '1',
        dmst_stex_tp: 'KRX'
      }, {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'authorization': `Bearer ${KiwoomService.accessToken}`,
          'cont-yn': 'N',
          'next-key': '',
          'api-id': 'ka10076' // 체결요청
        }
      });
      
      console.log('체결내역 응답:', response1.data.return_code, response1.data.return_msg);
      if (response1.data.return_code === 0) {
        console.log('체결 데이터:', JSON.stringify(response1.data, null, 2));
      }
    } catch (error) {
      console.log('❌ 체결내역 조회 실패:', error.response?.data || error.message);
    }
    
    // 2. 당일매매일지요청 API (ka10170)
    console.log('\n2. 당일 매매일지 조회 (ka10170)...');
    try {
      const response2 = await axios.post('https://api.kiwoom.com/api/dostk/acnt', {
        qry_tp: '1',
        dmst_stex_tp: 'KRX'
      }, {
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'authorization': `Bearer ${KiwoomService.accessToken}`,
          'cont-yn': 'N',
          'next-key': '',
          'api-id': 'ka10170' // 당일매매일지요청
        }
      });
      
      console.log('매매일지 응답:', response2.data.return_code, response2.data.return_msg);
      if (response2.data.return_code === 0) {
        console.log('매매일지 데이터:', JSON.stringify(response2.data, null, 2));
      }
    } catch (error) {
      console.log('❌ 매매일지 조회 실패:', error.response?.data || error.message);
    }
    
    console.log('\n💡 매매기록 표시 시점:');
    console.log('1. 실제 매수/매도 체결 시');
    console.log('2. 터틀 신호 발생하여 자동 거래 시');
    console.log('3. 수동 거래 후 시스템에 기록 시');
    console.log('4. 현재: ETF는 수동 매수이므로 터틀 시스템 거래기록 없음');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
}

testKiwoomTrades().then(() => {
  console.log('\n✅ 거래내역 테스트 완료');
  process.exit(0);
}).catch(error => {
  console.error('❌ 실패:', error);
  process.exit(1);
});