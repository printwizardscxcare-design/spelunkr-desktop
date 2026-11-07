'use strict';
const { execFileSync } = require('node:child_process');
if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/build-caption-reader.ps1'], { stdio: 'inherit' });
}
execFileSync(process.execPath, ['scripts/build-whisper.cjs'], { stdio: 'inherit' });
