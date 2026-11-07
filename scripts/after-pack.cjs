'use strict';
const path = require('node:path');
const { execFileSync } = require('node:child_process');
// Check the actual copied resources before spending time compressing installers.
module.exports = async context => {
  const platform = context.electronPlatformName;
  const resourceRoot = platform === 'darwin' ? path.join(context.appOutDir, context.packager.appInfo.productFilename + '.app/Contents/Resources') : path.join(context.appOutDir, 'resources');
  const helper = path.join(resourceRoot, 'native/whisper', platform === 'win32' ? 'caption-reader.exe' : 'caption-reader');
  const fixture = path.join(context.packager.projectDir, 'native/bin/test.wav');
  let output;
  try {
    output = execFileSync(helper, ['--test-wav', fixture], { encoding: 'utf8', timeout: 180000 });
  } catch (error) {
    throw new Error('Packaged Whisper helper failed: ' + error.stdout + error.stderr);
  }
  const events = output.trim().split('\n').map(line => JSON.parse(line));
  if (!events.some(item => item.type === 'caption' && /\b(one|1)\b/i.test(item.text))) {
    throw new Error('Packaged Whisper caption recognition failed: ' + output);
  }
  console.log('Packaged Whisper speech model and recognition passed.');
};
