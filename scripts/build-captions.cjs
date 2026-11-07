'use strict';
const { execFileSync } = require('node:child_process');
if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/build-caption-reader.ps1'], { stdio: 'inherit' });
} else if (process.platform === 'linux') {
  execFileSync('python3', ['scripts/build-linux-captions.py'], { stdio: 'inherit' });
} else {
  throw new Error('Caption packaging currently supports Windows and Linux.');
}
