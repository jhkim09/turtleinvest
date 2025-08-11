const mongoose = require('mongoose');
const User = require('./models/User');
const Counselor = require('./models/Counselor');
const Company = require('./models/Company');
const CounselingCenter = require('./models/CounselingCenter');
const CounselingSession = require('./models/CounselingSession');

async function checkData() {
  try {
    require('dotenv').config();
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('=== 데이터베이스 현황 ===');
    
    // 전체 통계
    const totalCompanies = await Company.countDocuments();
    const totalEmployees = await User.countDocuments({ role: { $in: ['employee', 'manager'] } });
    const totalCounselors = await Counselor.countDocuments();
    const totalCounselingCenters = await CounselingCenter.countDocuments();
    const totalSessions = await CounselingSession.countDocuments();
    
    console.log('전체 기업 수:', totalCompanies);
    console.log('전체 직원 수:', totalEmployees);
    console.log('전체 상담사 수:', totalCounselors);
    console.log('전체 상담센터 수:', totalCounselingCenters);
    console.log('전체 상담 세션 수:', totalSessions);
    
    console.log('\n=== 상담사 상세 ===');
    const counselors = await Counselor.find({}, 'name email specialties isActive');
    counselors.forEach((c, i) => {
      console.log(`${i+1}. ${c.name} (${c.email}) - 활성: ${c.isActive}`);
    });
    
    console.log('\n=== 상담센터 상세 ===');
    const centers = await CounselingCenter.find({}, 'name location isActive');
    centers.forEach((c, i) => {
      console.log(`${i+1}. ${c.name} (${c.location}) - 활성: ${c.isActive}`);
    });
    
    console.log('\n=== 기업 상세 ===');
    const companies = await Company.find({}, 'name isActive');
    companies.forEach((c, i) => {
      console.log(`${i+1}. ${c.name} - 활성: ${c.isActive}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('오류:', error);
  }
}

checkData();