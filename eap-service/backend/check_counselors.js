const mongoose = require("mongoose");
const User = require("./models/User");
const CounselingGoal = require("./models/CounselingGoal");
require("dotenv").config();

async function checkAndCreateTestGoals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB 연결 성공");
    
    const employee = await User.findOne({ email: "employee@test.com" });
    if (\!employee) {
      console.log("❌ 직원 계정 없음");
      return;
    }
    console.log("✅ 직원:", employee.name);
    
    const counselors = await User.find({ 
      role: { $in: ["counselor", "financial-advisor"] }
    }).select("name email role");
    
    console.log("\n상담사 목록:");
    counselors.forEach((counselor, i) => {
      console.log(`${i+1}. ${counselor.name} (${counselor.email}) - ${counselor.role}`);
    });
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error("❌ 오류:", error.message);
    await mongoose.disconnect();
  }
}

checkAndCreateTestGoals();
