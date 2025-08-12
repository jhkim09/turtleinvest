const axios = require('axios');

async function testCounselorsListAPI() {
  try {
    // super-admin으로 로그인
    console.log('1. Super Admin 로그인...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ 로그인 성공');

    // 상담사 목록 조회
    console.log('\n2. 상담사 목록 조회...');
    const counselorsResponse = await axios.get('http://localhost:3000/api/counselors', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('API 응답 전체:', counselorsResponse.data);
    console.log('\n상담사 목록:');
    
    const counselors = counselorsResponse.data?.counselors || counselorsResponse.data || [];
    console.log('counselors 배열:', counselors);
    
    counselors.forEach((counselor, index) => {
      console.log(`${index + 1}. ${counselor.name} (${counselor.email}) - 역할: ${counselor.role}`);
    });

    console.log(`\n총 ${counselors.length}명의 상담사가 조회되었습니다.`);
    
    const psychoCounselors = counselors.filter(c => c.role === 'counselor');
    const financialAdvisors = counselors.filter(c => c.role === 'financial-advisor');
    
    console.log(`심리상담사: ${psychoCounselors.length}명`);
    console.log(`재무상담사: ${financialAdvisors.length}명`);

  } catch (error) {
    console.error('❌ 오류:', error.response?.data || error.message);
  }
}

testCounselorsListAPI();