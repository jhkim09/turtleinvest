const axios = require('axios');

async function testCounselorAPI() {
  try {
    // 먼저 super-admin으로 로그인
    console.log('1. Super Admin 로그인 시도...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ 로그인 성공, 토큰:', token.substring(0, 20) + '...');

    // 상담사 등록 요청
    console.log('\n2. 상담사 등록 시도...');
    const counselorData = {
      name: '테스트상담사',
      email: 'test-counselor@example.com',
      phone: '010-1234-5678',
      password: 'test123',
      role: 'counselor',
      customRate: 80000,
      useSystemRate: false,
      taxRate: 3.3,
      isIndependent: true
    };

    console.log('요청 데이터:', counselorData);

    const createResponse = await axios.post('http://localhost:3000/api/counselors', 
      counselorData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✅ 상담사 등록 성공:', createResponse.data);

  } catch (error) {
    console.error('❌ 오류 발생:');
    if (error.response) {
      console.error('상태 코드:', error.response.status);
      console.error('응답 데이터:', error.response.data);
      console.error('응답 헤더:', error.response.headers);
    } else if (error.request) {
      console.error('요청이 전송되었지만 응답이 없음:', error.request);
    } else {
      console.error('오류 메시지:', error.message);
    }
  }
}

testCounselorAPI();