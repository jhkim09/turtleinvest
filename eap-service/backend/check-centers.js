const mongoose = require('mongoose');
const CounselingCenter = require('./models/CounselingCenter');

async function checkCenters() {
  try {
    require('dotenv').config();
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    
    console.log('=== 상담센터 현황 ===');
    const centers = await CounselingCenter.find({});
    console.log('총 상담센터 수:', centers.length);
    
    centers.forEach((c, i) => {
      console.log(`${i+1}. 이름: ${c.name}`);
      console.log(`   위치: ${c.location || '미정'}`);
      console.log(`   활성: ${c.isActive}`);
      console.log(`   전화: ${c.contactPhone || '미정'}`);
      console.log(`   이메일: ${c.contactEmail || '미정'}`);
      console.log(`   ID: ${c._id}`);
      console.log('---');
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('오류:', error);
  }
}

checkCenters();