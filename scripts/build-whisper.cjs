'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const bin = path.join(root, 'native/bin');
const output = path.join(bin, 'whisper');
const run = (file, args, options = {}) => execFileSync(file, args, { cwd: root, stdio: 'inherit', ...options });
const WHISPER = 'd1be6fde11ac6e0407606b4e42fe72d34add8037';
const AUDIOTEE = '56ac954369a09318e46b88a6eec33c2d2b0d32a3';

async function download(url, destination, sha) {
  if (fs.existsSync(destination) && (!sha || crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex') === sha)) return;
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (sha && crypto.createHash('sha256').update(data).digest('hex') !== sha) throw new Error('Download checksum failed: ' + path.basename(destination));
  fs.writeFileSync(destination, data);
}
function checkout(repo, sha, destination) {
  if (!fs.existsSync(path.join(destination, '.git'))) {
    fs.mkdirSync(destination, { recursive: true });
    run('git', ['init', destination]);
    run('git', ['remote', 'add', 'origin', `https://github.com/${repo}.git`], { cwd: destination });
  }
  const current = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: destination, encoding: 'utf8', stdio: ['ignore','pipe','ignore'] }).trim();
  if (current !== sha) {
    run('git', ['fetch', '--depth', '1', 'origin', sha], { cwd: destination });
    run('git', ['checkout', '--detach', sha], { cwd: destination });
  }
}
async function build() {
  fs.mkdirSync(output, { recursive: true });
  const ffmpeg = require('ffmpeg-static');
  if (!ffmpeg || !fs.existsSync(ffmpeg)) run(process.execPath,[require.resolve('ffmpeg-static/install.js')]);
  const ffmpegName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  fs.copyFileSync(ffmpeg,path.join(output,ffmpegName));
  if (process.platform !== 'win32') fs.chmodSync(path.join(output,ffmpegName),0o755);
  fs.copyFileSync(ffmpeg + '.LICENSE',path.join(output,'LICENSE-FFMPEG.txt'));
  fs.copyFileSync(ffmpeg + '.README',path.join(output,'SOURCE-FFMPEG.txt'));
  const source = path.join(bin, 'whisper-src');
  // Fetch a reviewed source revision, never an unpinned moving branch.
  if (!fs.existsSync(path.join(source, '.git'))) {
    run('git', ['clone', '--depth', '1', '--branch', 'v1.9.5', 'https://github.com/ggml-org/whisper.cpp.git', source]);
  }
  checkout('ggml-org/whisper.cpp', WHISPER, source);
  const buildDir = path.join(bin, 'whisper-build');
  const configure = ['-S', 'native/whisper', '-B', buildDir, `-DWHISPER_SOURCE=${source}`, '-DCMAKE_BUILD_TYPE=Release'];
  if (process.platform === 'win32') configure.push('-A', 'x64');
  if (process.platform === 'darwin') configure.push('-DCMAKE_OSX_DEPLOYMENT_TARGET=14.2');
  run('cmake', configure);
  run('cmake', ['--build', buildDir, '--config', 'Release', '--parallel', '4', '--target', 'caption-reader', 'caption-transcript-test']);
  run(path.join(buildDir, 'bin', process.platform === 'win32' ? 'Release' : '', 'caption-transcript-test' + (process.platform === 'win32' ? '.exe' : '')) , []);
  const filename = process.platform === 'win32' ? 'caption-reader.exe' : 'caption-reader';
  fs.copyFileSync(path.join(buildDir, 'bin', process.platform === 'win32' ? 'Release' : '', filename), path.join(output, filename));
  function copyLibraries(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
      const file=path.join(directory,entry.name);
      if(entry.isDirectory()) copyLibraries(file);
      else if(/\.(dll|dylib)$|\.so(\.\d+)*$/.test(entry.name)) fs.copyFileSync(file,path.join(output,entry.name));
    }
  }
  copyLibraries(buildDir);
  if (process.platform !== 'win32') fs.chmodSync(path.join(output, filename), 0o755);
  for (const [file, sha] of [
    ['ggml-base.en-q5_1.bin', '4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f'],
    ['ggml-tiny.en-q5_1.bin', 'c77c5766f1cef09b6b7d47f21b546cbddd4157886b3b5d6d4f709e91e66c7c2b']
  ]) await download(`https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${file}`, path.join(output, file), sha);
  await download('https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin', path.join(output, 'ggml-silero-v6.2.0.bin'), '2aa269b785eeb53a82983a20501ddf7c1d9c48e33ab63a41391ac6c9f7fb6987');
  await download('https://raw.githubusercontent.com/alphacep/vosk-api/v0.3.45/python/example/test.wav', path.join(bin, 'test.wav'));
  fs.copyFileSync(path.join(source, 'samples/jfk.wav'), path.join(bin, 'jfk.wav'));
  fs.copyFileSync(path.join(source, 'LICENSE'), path.join(output, 'LICENSE-WHISPER.txt'));
  // Whisper's vendored GGML is covered by the source tree's root MIT license.
  fs.copyFileSync(path.join(source, 'LICENSE'), path.join(output, 'LICENSE-GGML.txt'));
  await download('https://raw.githubusercontent.com/snakers4/silero-vad/066409f3d9db45a30d21dfcbf9147826ffdd7052/LICENSE', path.join(output, 'LICENSE-SILERO.txt'));
  await download('https://raw.githubusercontent.com/openai/whisper/main/LICENSE', path.join(output, 'LICENSE-WHISPER-MODELS.txt'));
  fs.copyFileSync(path.join(root, 'native/WHISPER-NOTICES.md'), path.join(output, 'WHISPER-NOTICES.md'));
  if (process.platform === 'darwin') {
    const iconset = path.join(bin, 'icon.iconset'); fs.mkdirSync(iconset, {recursive:true});
    for (const size of [16,32,128,256,512]) for (const scale of [1,2]) {
      run('sips', ['-z', String(size*scale), String(size*scale), 'assets/icon.png', '--out', path.join(iconset, 'icon_'+size+'x'+size+(scale===2?'@2x':'')+'.png')]);
    }
    run('iconutil', ['-c','icns',iconset,'-o',path.join(bin,'icon.icns')]);
    const audio = path.join(bin, 'audiotee-src');
    if (!fs.existsSync(path.join(audio, '.git'))) run('git', ['clone', 'https://github.com/makeusabrew/audiotee.git', audio]);
    checkout('makeusabrew/audiotee', AUDIOTEE, audio);
    run('swift', ['build', '-c', 'release'], { cwd: audio });
    const swiftBin = execFileSync('swift', ['build', '-c', 'release', '--show-bin-path'], { cwd: audio, encoding: 'utf8' }).trim();
    fs.copyFileSync(path.join(swiftBin, 'audiotee'), path.join(output, 'audiotee'));
    fs.chmodSync(path.join(output, 'audiotee'), 0o755);
    const readme = fs.readFileSync(path.join(audio, 'README.md'), 'utf8');
    fs.writeFileSync(path.join(output, 'LICENSE-AUDIOTEE.txt'), readme.slice(readme.indexOf('## License')));
  }
}
build().catch(error => { console.error(error); process.exitCode = 1; });
