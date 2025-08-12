const mongoose = require('mongoose');
const User = require('./models/User');
const Company = require('./models/Company');
require('dotenv').config();

async function createEmployeeTestUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('MongoDB 연결 성공');

    // 테스트 회사 생성 (없으면)
    let company = await Company.findOne({ name: '테스트회사' });
    if (!company) {
      company = new Company({
        name: '테스트회사',
        domain: 'testcompany.com',
        industry: 'IT/서비스',
        address: '서울시 강남구 테스트로 123',
        phone: '02-1234-5678',
        email: 'contact@testcompany.com',
        plan: 'standard',
        balance: 5000000,
        businessRegistrationNumber: '999-88-77777',
        contactPerson: {
          name: '테스트담당자',
          position: 'HR팀장',
          phone: '02-1234-5679',
          email: 'hr@testcompany.com'
        },
        settings: {
          maxEmployees: 100,
          allowSelfRegistration: true,
          annualCounselingLimit: 10,
          departments: ['개발팀', '디자인팀', '기획팀', '마케팅팀']
        }
      });
      await company.save();
      console.log('테스트 회사 생성 완료');
    }

    // 직원 계정 생성
    const employee = new User({
      name: '이직원',
      email: 'employee@test.com',
      password: 'password123',
      role: 'employee',
      department: '개발팀',
      employeeId: 'EMP001',
      company: company._id,
      isActive: true,
      annualCounselingUsage: {
        year: 2024,
        used: 2,
        limit: 10
      }
    });

    // 기존 계정 삭제 후 새로 생성
    await User.deleteOne({ email: 'employee@test.com' });
    await employee.save();

    console.log('✅ 직원 테스트 계정 생성 완료:');
    console.log('직원: employee@test.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('직원 계정 생성 오류:', error);
    process.exit(1);
  }
}

createEmployeeTestUser();