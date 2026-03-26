const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = 'C:/hackathon-offboarding-mcp';
let out = '';

// Step 1: Kill whatever is on port 3000
try {
  const pids = execSync('netstat -aon | findstr ":3000 "', { shell: 'cmd.exe', encoding: 'utf8' });
  const pidSet = new Set();
  pids.split('\n').forEach(line => {
    const m = line.trim().split(/\s+/);
    const pid = m[m.length - 1];
    if (pid && /^\d+$/.test(pid) && pid !== '0') pidSet.add(pid);
  });
  for (const pid of pidSet) {
    try { execSync('taskkill /F /PID ' + pid, { shell: 'cmd.exe', encoding: 'utf8' }); out += 'Killed PID ' + pid + '\n'; } catch(e) { out += 'Could not kill ' + pid + ': ' + e.message + '\n'; }
  }
} catch(e) {
  out += 'No process found on port 3000 (or netstat failed)\n';
}

fs.writeFileSync(cwd + '/restart-out.txt', out, 'utf8');
console.log('Kill step done:', out);

// Step 2: Start new server detached
const child = spawn('node', ['dist/server.js'], {
  cwd,
  detached: true,
  stdio: 'ignore',
  shell: false
});
child.unref();

fs.appendFileSync(cwd + '/restart-out.txt', 'New server started (PID will be shown in restart-out.txt)\n');
console.log('New server launched');
