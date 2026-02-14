#!/usr/bin/env node

const http = require('http');

console.log('🔍 Checking BloodLink Backend Health...\n');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`✅ Backend is running! Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const healthData = JSON.parse(data);
      console.log('📊 Health Data:', healthData);
    } catch (e) {
      console.log('📄 Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Backend is not running or not accessible:', error.message);
  console.log('💡 Make sure to start the backend server first with: npm run dev');
});

req.on('timeout', () => {
  console.error('⏰ Request timed out - backend might be starting up');
  req.destroy();
});

req.end();
