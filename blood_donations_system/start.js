#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🩸 Starting BloodLink Application...\n');

// Start backend server
console.log('📡 Starting Backend Server...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// Start frontend server
console.log('🎨 Starting Frontend Server...');
const frontend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

// Handle errors
backend.on('error', (err) => {
  console.error('❌ Backend error:', err);
});

frontend.on('error', (err) => {
  console.error('❌ Frontend error:', err);
});

console.log('✅ Both servers are starting...');
console.log('🌐 Frontend will be available at: http://localhost:3000');
console.log('🔧 Backend API will be available at: http://localhost:5000');
console.log('📊 Health check: http://localhost:5000/health');
console.log('\nPress Ctrl+C to stop both servers\n');
