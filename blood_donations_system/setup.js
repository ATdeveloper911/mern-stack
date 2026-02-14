#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🩸 BloodLink Setup Script');
console.log('========================\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js version 18 or higher is required');
  console.error(`   Current version: ${nodeVersion}`);
  process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Create necessary directories
const directories = [
  'backend/logs',
  'frontend/src/components',
  'frontend/src/pages',
  'frontend/src/hooks',
  'frontend/src/services',
  'frontend/src/utils',
  'frontend/src/styles',
  'frontend/public'
];

console.log('\n📁 Creating directories...');
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`   Created: ${dir}`);
  } else {
    console.log(`   Exists: ${dir}`);
  }
});

// Create .env files if they don't exist
console.log('\n🔧 Setting up environment files...');

const backendEnvPath = 'backend/.env';
if (!fs.existsSync(backendEnvPath)) {
  fs.copyFileSync('backend/env.example', backendEnvPath);
  console.log('   Created: backend/.env (from env.example)');
  console.log('   ⚠️  Please update backend/.env with your configuration');
} else {
  console.log('   Exists: backend/.env');
}

const frontendEnvPath = 'frontend/.env';
if (!fs.existsSync(frontendEnvPath)) {
  const frontendEnvContent = `REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_APP_NAME=BloodLink
REACT_APP_VERSION=1.0.0`;
  
  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log('   Created: frontend/.env');
} else {
  console.log('   Exists: frontend/.env');
}

// Install dependencies
console.log('\n📦 Installing dependencies...');

try {
  console.log('   Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('   Installing backend dependencies...');
  execSync('cd backend && npm install', { stdio: 'inherit' });
  
  console.log('   Installing frontend dependencies...');
  execSync('cd frontend && npm install', { stdio: 'inherit' });
  
  console.log('✅ All dependencies installed successfully!');
} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
  process.exit(1);
}

// Create initial database indexes (this would run when server starts)
console.log('\n🗄️  Database setup...');
console.log('   Database indexes will be created automatically when the server starts');
console.log('   Make sure to update your MongoDB connection string in backend/.env');

// Create a simple health check script
const healthCheckScript = `#!/usr/bin/env node
const http = require('http');

const checkServer = (port, name) => {
  return new Promise((resolve) => {
    const req = http.get(\`http://localhost:\${port}/health\`, (res) => {
      if (res.statusCode === 200) {
        console.log(\`✅ \${name} server is running on port \${port}\`);
        resolve(true);
      } else {
        console.log(\`❌ \${name} server returned status \${res.statusCode}\`);
        resolve(false);
      }
    });
    
    req.on('error', () => {
      console.log(\`❌ \${name} server is not running on port \${port}\`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log(\`❌ \${name} server timeout on port \${port}\`);
      req.destroy();
      resolve(false);
    });
  });
};

const checkServers = async () => {
  console.log('🔍 Checking server status...');
  
  const backendRunning = await checkServer(5000, 'Backend');
  const frontendRunning = await checkServer(3000, 'Frontend');
  
  if (backendRunning && frontendRunning) {
    console.log('\\n🎉 All servers are running!');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Backend:  http://localhost:5000');
  } else {
    console.log('\\n⚠️  Some servers are not running. Try: npm run dev');
  }
};

checkServers();
`;

fs.writeFileSync('health-check.js', healthCheckScript);
fs.chmodSync('health-check.js', '755');

console.log('\n🎯 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('   1. Update backend/.env with your MongoDB connection string');
console.log('   2. Update backend/.env with your email service credentials');
console.log('   3. Update backend/.env with your Cloudinary credentials');
console.log('   4. Run: npm run dev');
console.log('   5. Open: http://localhost:3000');
console.log('\n🔧 Useful commands:');
console.log('   npm run dev          - Start both servers');
console.log('   npm run server       - Start backend only');
console.log('   npm run client       - Start frontend only');
console.log('   node health-check.js - Check server status');
console.log('   npm run build        - Build for production');
console.log('\n📚 Documentation:');
console.log('   See README.md for detailed setup instructions');
console.log('\n🩸 BloodLink - Connecting Lives Through Blood Donation');
