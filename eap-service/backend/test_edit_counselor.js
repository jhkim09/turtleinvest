const axios = require('axios');

async function testEditCounselor() {
  try {
    // 먼저 super-admin으로 로그인
    console.log('1. Super Admin 로그인...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ 로그인 성공');

    // 테스트상담사 정보 업데이트
    console.log('\n2. 테스트상담사 정보 업데이트...');
    const counselorId = '689a89e832f51d5d055dd0ec'; // 테스트상담사 ID
    
    const updateData = {
      phone: '010-5555-6666',
      experience: 2,
      specialties: ['인지치료', '가족상담', '청소년상담']
    };

    console.log('업데이트 데이터:', updateData);

    const updateResponse = await axios.put(`http://localhost:3000/api/counselors/${counselorId}`, 
      updateData,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✅ 상담사 정보 업데이트 성공');
    console.log('업데이트된 정보:', {
      name: updateResponse.data.name,
      phone: updateResponse.data.phone,
      experience: updateResponse.data.experience,
      specialties: updateResponse.data.specialties
    });

  } catch (error) {
    console.error('❌ 오류 발생:');
    if (error.response) {
      console.error('상태 코드:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    } else {
      console.error('오류 메시지:', error.message);
    }
  }
}

testEditCounselor();