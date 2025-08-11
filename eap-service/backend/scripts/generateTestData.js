const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

// 테스트 데이터 생성
async function generateTestData() {
  console.log('테스트 데이터 생성 시작...');

  try {
    // 1. 기존 테스트 데이터 삭제 (super-admin 제외)
    await User.deleteMany({ role: { $ne: 'super-admin' } });
    await Company.deleteMany({});
    await CounselingCenter.deleteMany({});
    await Counselor.deleteMany({});
    await Appointment.deleteMany({});
    await CounselorPayment.deleteMany({});
    
    console.log('기존 테스트 데이터 삭제 완료');

    // 2. 테스트 회사 3개 생성
    const companies = await Company.create([
      {
        name: '삼성전자',
        domain: 'samsung.com',
        industry: 'IT/전자',
        address: '서울시 강남구 테헤란로 123',
        phone: '02-1234-5678',
        email: 'contact@samsung.com',
        plan: 'enterprise',
        balance: 10000000,
        businessRegistrationNumber: '123-45-67890',
        contactPerson: {
          name: '김삼성',
          position: '인사팀장',
          phone: '02-1234-5679',
          email: 'hr@samsung.com'
        },
        settings: {
          maxEmployees: 1000,
          allowSelfRegistration: true,
          annualCounselingLimit: 15,
          departments: ['개발팀', '디자인팀', '기획팀', '마케팅팀', '인사팀']
        }
      },
      {
        name: 'LG전자',
        domain: 'lge.com',
        industry: 'IT/전자',
        address: '서울시 영등포구 여의도동 456',
        phone: '02-2345-6789',
        email: 'contact@lge.com',
        plan: 'premium',
        balance: 5000000,
        businessRegistrationNumber: '234-56-78901',
        contactPerson: {
          name: '박엘지',
          position: '총무팀장',
          phone: '02-2345-6790',
          email: 'admin@lge.com'
        },
        settings: {
          maxEmployees: 500,
          allowSelfRegistration: false,
          annualCounselingLimit: 12,
          departments: ['연구팀', '생산팀', '품질팀', '영업팀', '경영지원팀']
        }
      },
      {
        name: '카카오',
        domain: 'kakao.com',
        industry: 'IT/서비스',
        address: '제주시 첨단로 789',
        phone: '064-1234-5678',
        email: 'contact@kakao.com',
        plan: 'standard',
        balance: 3000000,
        businessRegistrationNumber: '345-67-89012',
        contactPerson: {
          name: '최카카오',
          position: 'HR매니저',
          phone: '064-1234-5679',
          email: 'hr@kakao.com'
        },
        settings: {
          maxEmployees: 300,
          allowSelfRegistration: true,
          annualCounselingLimit: 10,
          departments: ['플랫폼팀', '콘텐츠팀', 'AI팀', '비즈니스팀', '전략기획팀']
        }
      }
    ]);
    console.log('✓ 테스트 회사 3개 생성 완료');

    // 3. 테스트 상담센터 3개 생성
    const counselingCenters = await CounselingCenter.create([
      {
        name: '서울마음케어센터',
        type: 'center',
        description: '서울 지역 전문 상담센터',
        businessLicense: 'BL-2024-001',
        address: {
          street: '강남대로 123번길 45',
          city: '서울',
          state: '강남구',
          zipCode: '06234'
        },
        contact: {
          phone: '02-555-1234',
          email: 'info@seoulcare.com',
          website: 'www.seoulcare.com'
        },
        specialties: ['스트레스 관리', '직장 내 갈등', '심리치료', '정신건강'],
        operatingHours: {
          monday: { start: '09:00', end: '18:00', isOpen: true },
          tuesday: { start: '09:00', end: '18:00', isOpen: true },
          wednesday: { start: '09:00', end: '18:00', isOpen: true },
          thursday: { start: '09:00', end: '18:00', isOpen: true },
          friday: { start: '09:00', end: '18:00', isOpen: true },
          saturday: { start: '10:00', end: '15:00', isOpen: true },
          sunday: { start: '', end: '', isOpen: false }
        },
        totalSessions: 156,
        rating: 4.8,
        totalRatings: 89
      },
      {
        name: '부산웰니스센터',
        type: 'center',
        description: '부산 지역 종합 상담센터',
        businessLicense: 'BL-2024-002',
        address: {
          street: '해운대로 567번길 89',
          city: '부산',
          state: '해운대구',
          zipCode: '48094'
        },
        contact: {
          phone: '051-777-5678',
          email: 'info@busanwellness.com',
          website: 'www.busanwellness.com'
        },
        specialties: ['워라밸', '진로 상담', '가족상담', '재무상담'],
        operatingHours: {
          monday: { start: '08:30', end: '17:30', isOpen: true },
          tuesday: { start: '08:30', end: '17:30', isOpen: true },
          wednesday: { start: '08:30', end: '17:30', isOpen: true },
          thursday: { start: '08:30', end: '17:30', isOpen: true },
          friday: { start: '08:30', end: '17:30', isOpen: true },
          saturday: { start: '09:00', end: '14:00', isOpen: true },
          sunday: { start: '', end: '', isOpen: false }
        },
        totalSessions: 98,
        rating: 4.5,
        totalRatings: 52
      },
      {
        name: '대구힐링센터',
        type: 'center',
        description: '대구 지역 전문 힐링센터',
        businessLicense: 'BL-2024-003',
        address: {
          street: '동대구로 321번길 12',
          city: '대구',
          state: '수성구',
          zipCode: '42130'
        },
        contact: {
          phone: '053-888-9012',
          email: 'info@daeguhealing.com',
          website: 'www.daeguhealing.com'
        },
        specialties: ['업무 효율성', '법률상담', '중독치료', '기타'],
        operatingHours: {
          monday: { start: '09:00', end: '19:00', isOpen: true },
          tuesday: { start: '09:00', end: '19:00', isOpen: true },
          wednesday: { start: '09:00', end: '19:00', isOpen: true },
          thursday: { start: '09:00', end: '19:00', isOpen: true },
          friday: { start: '09:00', end: '19:00', isOpen: true },
          saturday: { start: '', end: '', isOpen: false },
          sunday: { start: '', end: '', isOpen: false }
        },
        totalSessions: 67,
        rating: 4.2,
        totalRatings: 31
      }
    ]);
    console.log('✓ 테스트 상담센터 3개 생성 완료');

    // 4. 각 회사별 직원 계정 3개씩 생성 (총 9개)
    const employees = [];
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const companyEmployees = await User.create([
        {
          email: `employee1@${company.domain}`,
          password: 'password123',
          name: `${company.name.charAt(0)}직원1`,
          role: 'employee',
          department: company.settings.departments[0],
          employeeId: `${company.name.slice(0, 2).toUpperCase()}001`,
          company: company._id,
          annualCounselingUsage: {
            year: 2024,
            used: Math.floor(Math.random() * 5),
            limit: company.settings.annualCounselingLimit
          }
        },
        {
          email: `employee2@${company.domain}`,
          password: 'password123',
          name: `${company.name.charAt(0)}직원2`,
          role: 'employee',
          department: company.settings.departments[1],
          employeeId: `${company.name.slice(0, 2).toUpperCase()}002`,
          company: company._id,
          annualCounselingUsage: {
            year: 2024,
            used: Math.floor(Math.random() * 8),
            limit: company.settings.annualCounselingLimit
          }
        },
        {
          email: `manager@${company.domain}`,
          password: 'password123',
          name: `${company.name.charAt(0)}매니저`,
          role: 'manager',
          department: company.settings.departments[2],
          employeeId: `${company.name.slice(0, 2).toUpperCase()}M01`,
          company: company._id,
          annualCounselingUsage: {
            year: 2024,
            used: Math.floor(Math.random() * 3),
            limit: company.settings.annualCounselingLimit
          }
        }
      ]);
      employees.push(...companyEmployees);
    }
    console.log('✓ 테스트 직원 계정 9개 생성 완료');

    // 5. 상담사 계정 3개 생성
    const counselors = await User.create([
      {
        email: 'counselor1@counseling.com',
        password: 'password123',
        name: '김상담',
        role: 'counselor',
        customRate: 80000,
        useSystemRate: false,
        taxRate: 3.3,
        counselingCenter: counselingCenters[0]._id,
        isIndependent: false
      },
      {
        email: 'counselor2@counseling.com',
        password: 'password123',
        name: '이치료',
        role: 'counselor',
        customRate: 90000,
        useSystemRate: false,
        taxRate: 10,
        counselingCenter: counselingCenters[1]._id,
        isIndependent: false
      },
      {
        email: 'counselor3@independent.com',
        password: 'password123',
        name: '박개업',
        role: 'counselor',
        customRate: 100000,
        useSystemRate: false,
        taxRate: 3.3,
        isIndependent: true
      }
    ]);
    
    // 상담센터에 상담사 연결
    await CounselingCenter.findByIdAndUpdate(
      counselingCenters[0]._id,
      { $push: { counselors: counselors[0]._id } }
    );
    await CounselingCenter.findByIdAndUpdate(
      counselingCenters[1]._id,
      { $push: { counselors: counselors[1]._id } }
    );
    
    console.log('✓ 테스트 상담사 계정 3개 생성 완료');

    // 6. Counselor 컬렉션에도 데이터 생성
    await Counselor.create([
      {
        name: '김상담',
        email: 'counselor1@counseling.com',
        password: 'password123',
        phone: '010-1111-1111',
        specialties: ['스트레스 관리', '직장 내 갈등'],
        licenseNumber: 'CL-2024-001',
        experience: 5,
        rates: {
          faceToFace: 80000,
          phoneVideo: 60000,
          chat: 40000
        },
        maxDailyAppointments: 6,
        availableHours: {
          monday: { start: '09:00', end: '18:00', available: true },
          tuesday: { start: '09:00', end: '18:00', available: true },
          wednesday: { start: '09:00', end: '18:00', available: true },
          thursday: { start: '09:00', end: '18:00', available: true },
          friday: { start: '09:00', end: '18:00', available: true },
          saturday: { start: '10:00', end: '15:00', available: true },
          sunday: { start: '', end: '', available: false }
        },
        totalSessions: 87,
        rating: 4.7,
        totalRatings: 43
      },
      {
        name: '이치료',
        email: 'counselor2@counseling.com',
        password: 'password123',
        phone: '010-2222-2222',
        specialties: ['워라밸', '진로 상담', '가족상담'],
        licenseNumber: 'CL-2024-002',
        experience: 8,
        rates: {
          faceToFace: 90000,
          phoneVideo: 70000,
          chat: 50000
        },
        maxDailyAppointments: 8,
        availableHours: {
          monday: { start: '08:30', end: '17:30', available: true },
          tuesday: { start: '08:30', end: '17:30', available: true },
          wednesday: { start: '08:30', end: '17:30', available: true },
          thursday: { start: '08:30', end: '17:30', available: true },
          friday: { start: '08:30', end: '17:30', available: true },
          saturday: { start: '09:00', end: '14:00', available: true },
          sunday: { start: '', end: '', available: false }
        },
        totalSessions: 124,
        rating: 4.9,
        totalRatings: 67
      },
      {
        name: '박개업',
        email: 'counselor3@independent.com',
        password: 'password123',
        phone: '010-3333-3333',
        specialties: ['심리치료', '정신건강', '중독치료'],
        licenseNumber: 'CL-2024-003',
        experience: 12,
        rates: {
          faceToFace: 100000,
          phoneVideo: 80000,
          chat: 60000
        },
        maxDailyAppointments: 5,
        availableHours: {
          monday: { start: '10:00', end: '19:00', available: true },
          tuesday: { start: '10:00', end: '19:00', available: true },
          wednesday: { start: '10:00', end: '19:00', available: true },
          thursday: { start: '10:00', end: '19:00', available: true },
          friday: { start: '10:00', end: '19:00', available: true },
          saturday: { start: '', end: '', available: false },
          sunday: { start: '', end: '', available: false }
        },
        totalSessions: 203,
        rating: 4.6,
        totalRatings: 94
      }
    ]);
    console.log('✓ Counselor 컬렉션 데이터 생성 완료');

    // 7. 예약/배정 테스트 데이터 생성
    const appointments = [];
    const today = new Date();
    for (let i = 0; i < 15; i++) {
      const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
      const randomCounselor = counselors[Math.floor(Math.random() * counselors.length)];
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 1);
      
      appointments.push({
        employee: randomEmployee._id,
        counselor: randomCounselor._id,
        scheduledDate: futureDate,
        duration: [50, 60, 90][Math.floor(Math.random() * 3)],
        type: ['individual', 'group', 'emergency'][Math.floor(Math.random() * 3)],
        status: ['scheduled', 'completed'][Math.floor(Math.random() * 2)],
        reason: ['스트레스 관리', '직장 내 갈등', '워라밸', '진로 상담', '심리상담'][Math.floor(Math.random() * 5)],
        notes: '테스트 예약입니다.'
      });
    }
    
    await Appointment.create(appointments);
    console.log('✓ 테스트 예약 데이터 15개 생성 완료');

    // 7.5. 완료된 상담 세션 데이터 생성 (월매출 계산용)
    const sessions = [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // 이번 달과 지난 달에 대해 각각 세션 생성
    for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
      const sessionDate = new Date(currentYear, currentMonth - monthOffset, 15); // 월 중간 날짜
      
      for (let i = 0; i < 10; i++) {
        const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
        const randomCounselor = counselors[Math.floor(Math.random() * counselors.length)];
        const method = ['faceToFace', 'phoneVideo', 'chat'][Math.floor(Math.random() * 3)];
        const rates = {
          faceToFace: randomCounselor.customRate,
          phoneVideo: randomCounselor.customRate * 0.8,
          chat: randomCounselor.customRate * 0.5
        };
        
        sessions.push({
          employee: randomEmployee._id,
          counselor: randomCounselor._id,
          company: companies[Math.floor(Math.random() * companies.length)].name,
          appointmentDate: sessionDate,
          duration: method === 'chat' ? 30 : 60,
          counselingMethod: method,
          topic: ['스트레스 관리', '직장 내 갈등', '워라밸', '진로 상담', '심리상담'][Math.floor(Math.random() * 5)],
          status: 'completed',
          counselorRate: rates[method],
          notes: '테스트 완료 세션입니다.',
          createdAt: sessionDate,
          updatedAt: sessionDate
        });
      }
    }
    
    await CounselingSession.create(sessions);
    console.log('✓ 테스트 상담 세션 데이터 20개 생성 완료');

    // 8. 정산 테스트 데이터 생성
    const payments = [];
    for (let i = 0; i < counselors.length; i++) {
      const counselor = counselors[i];
      const sessionsCount = Math.floor(Math.random() * 20) + 10;
      const sessions = [];
      let totalAmount = 0;
      
      for (let j = 0; j < sessionsCount; j++) {
        const company = companies[Math.floor(Math.random() * companies.length)];
        const method = ['faceToFace', 'phoneVideo', 'chat'][Math.floor(Math.random() * 3)];
        const rates = { faceToFace: counselor.customRate, phoneVideo: counselor.customRate * 0.8, chat: counselor.customRate * 0.5 };
        const rate = rates[method];
        const amount = rate;
        totalAmount += amount;
        
        sessions.push({
          sessionId: new mongoose.Types.ObjectId(),
          company: company.name,
          employeeName: `테스트직원${j + 1}`,
          date: new Date(2024, 10, Math.floor(Math.random() * 28) + 1),
          method,
          duration: method === 'chat' ? 30 : 60,
          rate,
          amount
        });
      }
      
      const taxAmount = totalAmount * (counselor.taxRate / 100);
      const netAmount = totalAmount - taxAmount;
      
      payments.push({
        counselor: counselor._id,
        year: 2024,
        month: 11,
        sessions,
        summary: {
          totalSessions: sessionsCount,
          faceToFaceSessions: sessions.filter(s => s.method === 'faceToFace').length,
          phoneVideoSessions: sessions.filter(s => s.method === 'phoneVideo').length,
          chatSessions: sessions.filter(s => s.method === 'chat').length,
          totalAmount,
          taxAmount,
          netAmount
        },
        status: ['pending', 'processing', 'completed'][Math.floor(Math.random() * 3)],
        paymentMethod: 'bank_transfer'
      });
    }
    
    await CounselorPayment.create(payments);
    console.log('✓ 테스트 정산 데이터 3개 생성 완료');

    console.log('\n=== 테스트 데이터 생성 완료 ===');
    console.log('\n📊 생성된 데이터:');
    console.log(`- 회사: ${companies.length}개`);
    console.log(`- 상담센터: ${counselingCenters.length}개`);
    console.log(`- 직원: ${employees.length}명`);
    console.log(`- 상담사: ${counselors.length}명`);
    console.log(`- 예약: ${appointments.length}건`);
    console.log(`- 정산: ${payments.length}건`);
    
    console.log('\n🔐 테스트 계정:');
    console.log('\n【회사별 직원 계정】');
    companies.forEach((company, index) => {
      console.log(`\n${company.name}:`);
      console.log(`  - employee1@${company.domain} / password123`);
      console.log(`  - employee2@${company.domain} / password123`);
      console.log(`  - manager@${company.domain} / password123`);
    });
    
    console.log('\n【상담사 계정】');
    console.log('  - counselor1@counseling.com / password123 (김상담 - 서울마음케어센터)');
    console.log('  - counselor2@counseling.com / password123 (이치료 - 부산웰니스센터)');
    console.log('  - counselor3@independent.com / password123 (박개업 - 개업상담사)');
    
    console.log('\n【기존 계정】');
    console.log('  - superadmin@platform.com / password123 (슈퍼 관리자)');

  } catch (error) {
    console.error('테스트 데이터 생성 중 오류:', error);
  }
}

// 스크립트 실행
async function main() {
  await connectDB();
  await generateTestData();
  await mongoose.disconnect();
  console.log('\n✅ 테스트 데이터 생성 완료 및 데이터베이스 연결 종료');
}

main();