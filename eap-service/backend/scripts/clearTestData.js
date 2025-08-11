const mongoose = require('mongoose');

// 모델들 import
const User = require('../models/User');
const Counselor = require('../models/Counselor');
const Company = require('../models/Company');
const CounselingCenter = require('../models/CounselingCenter');
const Appointment = require('../models/Appointment');
const CounselorPayment = require('../models/CounselorPayment');
const CounselingSession = require('../models/CounselingSession');

// 데이터베이스 연결
async function connectDB() {
  try {
    require('dotenv').config();
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('MongoDB 연결됨');
  } catch (error) {
    console.error('MongoDB 연결 오류:', error);
    process.exit(1);
  }
}

// 모든 테스트 데이터 삭제 (super-admin 제외)
async function clearTestData() {
  console.log('테스트 데이터 삭제 시작...');

  try {
    // super-admin을 제외한 모든 데이터 삭제
    await User.deleteMany({ role: { $ne: 'super-admin' } });
    await Company.deleteMany({});
    await CounselingCenter.deleteMany({});
    await Counselor.deleteMany({});
    await Appointment.deleteMany({});
    await CounselorPayment.deleteMany({});
    await CounselingSession.deleteMany({});
    
    console.log('✅ 모든 테스트 데이터가 삭제되었습니다.');
    console.log('슈퍼어드민 계정은 유지됩니다: superadmin@platform.com');
    
  } catch (error) {
    console.error('테스트 데이터 삭제 중 오류:', error);
  }
}

// 스크립트 실행
async function main() {
  await connectDB();
  await clearTestData();
  await mongoose.disconnect();
  console.log('✅ 데이터 삭제 완료 및 데이터베이스 연결 종료');
}

main();