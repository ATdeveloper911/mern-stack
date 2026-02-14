#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🩸 Starting BloodLink Application in Debug Mode...\n');

// Function to start a process with error handling
const startProcess = (name, command, args, cwd) => {
  console.log(`📡 Starting ${name}...`);
  
  const process = spawn(command, args, {
    cwd: cwd,
    stdio: 'inherit',
    shell: true
  });

  process.on('error', (error) => {
    console.error(`❌ ${name} error:`, error.message);
  });

  process.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ ${name} exited with code ${code}`);
    } else {
      console.log(`✅ ${name} exited successfully`);
    }
  });

  return process;
};

// Start backend
const backend = startProcess(
  'Backend Server',
  'npm',
  ['run', 'dev'],
  path.join(__dirname, 'backend')
);

// Wait a bit for backend to start
setTimeout(() => {
  // Start frontend
  const frontend = startProcess(
    'Frontend Server',
    'npm',
    ['start'],
    path.join(__dirname, 'frontend')
  );

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

}, 3000);

console.log('✅ Both servers are starting...');
console.log('🌐 Frontend will be available at: http://localhost:3000');
console.log('🔧 Backend API will be available at: http://localhost:5000');
console.log('📊 Health check: http://localhost:5000/health');
console.log('\nPress Ctrl+C to stop both servers\n');
