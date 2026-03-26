const { execSync } = require('child_process');
const fs = require('fs');

const cwd = 'C:/hackathon-offboarding-mcp';
const opts = { cwd, encoding: 'utf8', timeout: 30000 };
let out = '';

try { execSync('git add -A', opts); out += 'git add OK\n'; } catch(e) { out += 'git add ERR: ' + e.stderr + '\n'; }
try { out += execSync('git commit -m "Fix dashboard URL in RUN-DEMO.bat"', opts) + '\\n'; } catch(e) { out += 'commit ERR: ' + e.message + '\\n'; }
try { out += execSync('git push origin main', opts) + '\n'; } catch(e) { out += 'push ERR: ' + e.message + '\n'; }

fs.writeFileSync(cwd + '/git-out.txt', out || 'no output', 'utf8');
console.log('Done');
