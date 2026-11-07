'use strict';
const {spawn,execFileSync} = require('node:child_process');
const {once} = require('node:events');
const path = require('node:path');
const assert = require('node:assert/strict');
const {CaptionReadAhead} = require('../src/caption-read-ahead.cjs');
const [root,fixture] = process.argv.slice(2);
const ffmpeg = path.join(root,'whisper',process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
const helper = path.join(root,'whisper',process.platform === 'win32' ? 'caption-reader.exe' : 'caption-reader');
const protocols = execFileSync(ffmpeg,['-hide_banner','-protocols'],{encoding:'utf8',windowsHide:true});
assert.match(protocols,/\bhttps\b/,'The bundled reader must support Archive HTTPS sources');
const children = [],cues = [];
// Substitute a local recorded fixture for the network input. The production
// reader, decoder/filter, PCM pipe, timestamp protocol and shutdown remain real.
const spawnProcess = (executable,args,options) => {
  if (executable === ffmpeg) {
    const network = new Set(['-rw_timeout','-reconnect','-reconnect_streamed','-reconnect_on_network_error','-reconnect_delay_max']);
    const local = [];
    for (let index=0;index<args.length;index++) {
      if (network.has(args[index])) {index++;continue;}
      if (args[index] === '-protocol_whitelist') {local.push(args[index],'file,pipe,crypto');index++;}
      else if (args[index] === '-i') {local.push(args[index],fixture);index++;}
      else local.push(args[index]);
    }
    args = local;
  }
  const child = spawn(executable,args,options);children.push(child);return child;
};
const reader = new CaptionReadAhead({ffmpeg,helper,spawnProcess});
reader.on('cue',cue => cues.push(cue));
async function main() {
  const completed = once(reader,'complete');
  let rejectFailure;
  const failure = new Promise((_resolve,reject)=>{rejectFailure=reject;});
  reader.on('failure',message=>rejectFailure(Error(message)));
  const timer = setTimeout(()=>rejectFailure(Error('Buffered caption pipeline did not finish within 30 seconds')),30000);
  try {
    reader.start({url:'https://archive.org/download/caption-test/recorded-fixture.wav',startMs:0,session:1});
    const [result] = await Promise.race([completed,failure]);
    assert.ok(result.untilMs>8000 && result.untilMs<9000,'The decoder and recognizer media clock must match the 8.3-second fixture');
    assert.ok(cues.length,'The packaged buffered pipeline must produce subtitle cues');
    assert.match(cues.map(cue=>cue.text).join(' '),/one|1/i);
    for (const cue of cues) assert.ok(cue.startMs>=0 && cue.endMs>cue.startMs && cue.endMs<=result.untilMs);
    reader.stop();
    await Promise.all(children.map(child=>child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : once(child,'close')));
    assert.ok(children.every(child=>child.exitCode !== null || child.signalCode !== null));
    console.log(`PASS: installed FFmpeg-to-Whisper read-ahead pipeline, ${cues.length} timed cues, media clock, HTTPS support, and process cleanup`);
  } finally {clearTimeout(timer);reader.stop();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
