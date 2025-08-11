const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const counselingRoutes = require('./routes/counseling');
const reportRoutes = require('./routes/reports');
const counselorRoutes = require('./routes/counselors');
const counselingSessionRoutes = require('./routes/counseling-sessions');
const companyRoutes = require('./routes/companies');
const counselorPaymentRoutes = require('./routes/counselor-payments');
const superAdminRoutes = require('./routes/super-admin');
const counselorRatesRoutes = require('./routes/counselor-rates');
const companyAdminRoutes = require('./routes/company-admin');
const counselingCenterRoutes = require('./routes/counseling-centers');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eap-service')
.then(() => {
  console.log('✅ MongoDB Atlas 연결 성공!');
  console.log('Database:', mongoose.connection.name);
})
.catch(err => {
  console.log('❌ MongoDB 연결 실패. 데모 모드로 실행됩니다.');
  console.log('Error:', err.message);
  console.log('💡 .env 파일의 MONGODB_URI를 확인하세요.');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/counseling', counselingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/counselors', counselorRoutes);
app.use('/api/counseling-sessions', counselingSessionRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/counselor-payments', counselorPaymentRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/counselor-rates', counselorRatesRoutes);
app.use('/api/company-admin', companyAdminRoutes);
app.use('/api/counseling-centers', counselingCenterRoutes);

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'EAP Service API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// 프로덕션에서 정적 파일 서빙 (React 빌드 파일)
if (process.env.NODE_ENV === 'production') {
  // 정적 파일 서빙
  app.use(express.static(path.join(__dirname, 'public')));
  
  // React Router용 fallback (모든 non-API 요청을 index.html로 전달)
  app.get('*', (req, res) => {
    // API 경로가 아닌 경우에만 index.html 반환
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 EAP Service running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});