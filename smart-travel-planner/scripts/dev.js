const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'backend');
const frontendDir = path.join(root, 'frontend');

const isWindows = process.platform === 'win32';

const run = (name, command, cwd) => {
  // On some Windows environments, spawning npm.cmd directly can throw EINVAL.
  // Using cmd.exe /c is more reliable.
  const child = isWindows
    ? spawn('cmd.exe', ['/c', command], {
        cwd,
        stdio: 'inherit',
        shell: false,
        env: process.env
      })
    : spawn('sh', ['-lc', command], {
        cwd,
        stdio: 'inherit',
        shell: false,
        env: process.env
      });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[${name}] exited due to signal ${signal}`);
      return;
    }
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });

  child.on('error', (err) => {
    console.error(`[${name}] failed to start: ${err.message}`);
  });

  return child;
};

const openBrowser = (url) => {
  // CRA usually opens automatically, but this ensures it on Windows.
  try {
    if (process.platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '', url], { stdio: 'ignore', shell: false });
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore' });
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore' });
    }
  } catch (_) {
    // Best-effort only
  }
};

const backend = run('backend', 'npm run dev', backendDir);
const frontend = run('frontend', 'npm start', frontendDir);

// Best-effort browser open a bit after startup
setTimeout(() => {
  openBrowser(process.env.FRONTEND_URL || 'http://localhost:3000');
}, 2500);

const shutdown = () => {
  if (backend && !backend.killed) backend.kill();
  if (frontend && !frontend.killed) frontend.kill();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
