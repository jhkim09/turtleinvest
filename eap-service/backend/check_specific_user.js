const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkSpecificUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service');
    console.log('MongoDB 연결 성공');

    console.log('=== 박재무 재무상담사 정보 확인 ===');
    const financialUser = await User.findOne({ email: 'financial@test.com' });
    if (financialUser) {
      console.log('찾은 사용자:', {
        _id: financialUser._id,
        name: financialUser.name,
        email: financialUser.email,
        role: financialUser.role,
        isActive: financialUser.isActive,
        customRate: financialUser.customRate,
        useSystemRate: financialUser.useSystemRate,
        taxRate: financialUser.taxRate,
        isIndependent: financialUser.isIndependent
      });
    } else {
      console.log('박재무 사용자를 찾을 수 없습니다.');
    }

    console.log('\n=== 정확한 조건으로 상담사 조회 ===');
    const counselors = await User.find({ 
      role: { $in: ['counselor', 'financial-advisor'] }
    })
      .select('name email role isActive')
      .sort({ createdAt: -1 });
    
    console.log(`총 ${counselors.length}명 조회됨:`);
    counselors.forEach((counselor, index) => {
      console.log(`${index + 1}. ${counselor.name} (${counselor.email}) - ${counselor.role}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('오류:', error);
    process.exit(1);
  }
}

checkSpecificUser();