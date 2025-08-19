require('dotenv').config();

console.log('환경변수 확인:');
console.log(`DART_API_KEY: ${process.env.DART_API_KEY}`);

const DartService = require('./services/dartService');

console.log('DartService 인스턴스 확인:');
console.log(`apiKey: ${DartService.apiKey}`);
console.log(`baseURL: ${DartService.baseURL}`);