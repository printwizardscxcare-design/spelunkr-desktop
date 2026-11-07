'use strict';
const path = require('node:path');
function captionOptions(root, platform, engine = 'whisper', speed = 'fast') {
  if (engine === 'windows' && platform === 'win32') return { executable: path.join(root, 'CaptionReader.exe'), args: [] };
  const executable = path.join(root, 'whisper', platform === 'win32' ? 'caption-reader.exe' : 'caption-reader');
  const args = [platform === 'win32' ? '--wasapi' : '--pcm', '--model', speed === 'fast' ? 'tiny.en' : 'base.en'];
  if (platform === 'win32') return { executable, args };
  if (platform === 'darwin') return { executable, args, capture: {
    executable: path.join(root, 'whisper/audiotee'), args: ['--sample-rate', '16000'],
    failure: 'Mac speaker capture stopped. Allow Spelunkr Desktop under System Settings > Privacy & Security > Screen & System Audio Recording (or System Audio Recording Only), then quit and reopen the app. Requires macOS 14.2 or later.'
  } };
  if (platform === 'linux') return { executable, args, capture: {
    executable: 'parec', args: ['--device=@DEFAULT_MONITOR@', '--format=s16le', '--rate=16000', '--channels=1', '--latency-msec=100', '--client-name=Spelunkr captions'],
    failure: 'Speaker capture stopped. Check that PulseAudio or PipeWire with PulseAudio compatibility is running. After changing output devices, toggle captions off and on.'
  } };
  throw new Error('Unsupported caption platform');
}
module.exports = { captionOptions };
