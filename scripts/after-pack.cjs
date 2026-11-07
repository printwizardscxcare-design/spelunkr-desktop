'use strict';
const path = require('node:path');
const { execFileSync } = require('node:child_process');
// Check the actual copied resources before spending time compressing installers.
module.exports = async context => {
  if (context.electronPlatformName !== 'linux') return;
  const helper = path.join(context.appOutDir, 'resources/native/linux/caption-reader');
  const fixture = path.join(context.packager.projectDir, 'native/bin/test.wav');
  let output;
  try {
    output = execFileSync(helper, ['--test-wav', fixture], { encoding: 'utf8', timeout: 60000 });
  } catch (error) {
    throw new Error('Packaged Linux helper failed: ' + error.stdout + error.stderr);
  }
  const events = output.trim().split('\n').map(line => JSON.parse(line));
  if (!events.some(item => item.type === 'caption' && /\bone\b/.test(item.text))) {
    throw new Error('Packaged Linux caption recognition failed: ' + output);
  }
  console.log('Packaged Linux speech model and recognition passed.');
};
