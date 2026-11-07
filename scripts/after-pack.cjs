'use strict';
const path = require('node:path');
const { execFileSync } = require('node:child_process');
// Check the actual copied resources before spending time compressing installers.
module.exports = async context => {
  const platform = context.electronPlatformName;
  const resourceRoot = platform === 'darwin' ? path.join(context.appOutDir, context.packager.appInfo.productFilename + '.app/Contents/Resources') : path.join(context.appOutDir, 'resources');
  const helper = path.join(resourceRoot, 'native/whisper', platform === 'win32' ? 'caption-reader.exe' : 'caption-reader');
  const fixture = path.join(context.packager.projectDir, 'native/bin/test.wav');
  execFileSync(process.execPath, [path.join(__dirname, 'check-whisper.cjs'), helper, fixture], {stdio:'inherit', timeout:300000});
  execFileSync(process.execPath, [path.join(__dirname, 'check-buffered-whisper.cjs'), helper, path.join(context.packager.projectDir,'native/bin/jfk.wav')], {stdio:'inherit', timeout:60000});
  execFileSync(path.join(resourceRoot,'native/whisper',platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),['-version'],{stdio:'inherit',timeout:15000});
  execFileSync(process.execPath,[path.join(__dirname,'check-audio-filter.cjs'),path.join(resourceRoot,'native/whisper',platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),fixture],{stdio:'inherit',timeout:30000});
};
