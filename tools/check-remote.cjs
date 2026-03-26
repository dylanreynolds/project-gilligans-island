const { execSync } = require('child_process');
const fs = require('fs');

const cwd = 'C:/hackathon-offboarding-mcp';
const opts = { cwd, encoding: 'utf8', timeout: 30000 };
let out = '';

try { out += execSync('git ls-remote --heads origin', opts); } catch(e) { out += 'ERR: ' + e.message; }

fs.writeFileSync(cwd + '/remote-check.txt', out || 'empty', 'utf8');
