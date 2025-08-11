const mongoose = require('mongoose');
const Company = require('./models/Company');
const User = require('./models/User');
require('dotenv').config();

async function createTestCompany() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공!');

    // 기존 회사어드민 찾기
    const existingAdmin = await User.findOne({ 
      email: 'admin@example.com',
      role: 'company-admin'
    });

    if (!existingAdmin) {
      console.log('❌ 회사어드민을 찾을 수 없습니다.');
      return;
    }

    // 테스트 회사 생성
    const testCompany = new Company({
      name: 'ABC 컴퍼니',
      domain: 'abc.com',
      industry: 'IT/소프트웨어',
      plan: 'standard',
      adminUser: existingAdmin._id,
      settings: {
        maxEmployees: 100,
        allowSelfRegistration: false
      }
    });

    const savedCompany = await testCompany.save();

    // 기존 회사어드민에 회사 연결
    existingAdmin.company = savedCompany._id;
    await existingAdmin.save();

    console.log('✅ 테스트 회사 생성 및 연결 완료!');
    console.log(`📢 회사: ${savedCompany.name}`);
    console.log(`🏢 도메인: ${savedCompany.domain}`);
    console.log(`👤 관리자: ${existingAdmin.name} (${existingAdmin.email})`);

    // 테스트 직원들도 같은 회사에 연결
    const employees = await User.find({ 
      role: { $in: ['employee', 'manager'] }
    });

    for (const employee of employees) {
      employee.company = savedCompany._id;
      await employee.save();
      console.log(`✅ ${employee.name} (${employee.role}) → ${savedCompany.name} 연결`);
    }

    await mongoose.disconnect();
    console.log('\n🎉 테스트 회사 및 직원 연결 완료!');
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

createTestCompany();