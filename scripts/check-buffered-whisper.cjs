'use strict';
const fs = require('node:fs');
const {spawn} = require('node:child_process');
const assert = require('node:assert/strict');
const [helper,file] = process.argv.slice(2);
const wav = fs.readFileSync(file);let pcm;
for (let at=12;at+8<=wav.length;) {const size=wav.readUInt32LE(at+4);if(wav.toString('ascii',at,at+4)==='data'){pcm=wav.subarray(at+8,at+8+size);break;}at+=8+size+(size%2);}
assert.ok(pcm);
const audio = Buffer.concat([Buffer.alloc(64000),pcm,Buffer.alloc(128000)]),events = [];
const child = spawn(helper,['--pcm','--timed','--model','tiny.en'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
let buffer = '';const started = Date.now();
child.stdout.setEncoding('utf8');child.stdout.on('data',data => {
  buffer += data;let end;
  while ((end=buffer.indexOf('\n'))>=0) {events.push(JSON.parse(buffer.slice(0,end)));buffer=buffer.slice(end+1);}
});
child.stderr.resume();child.stdin.on('error',()=>{});child.stdin.end(audio);
const timer = setTimeout(()=>child.kill(),30000);
child.on('error',error => {clearTimeout(timer);throw error;});
child.on('close',code => {
  clearTimeout(timer);assert.equal(code,0,JSON.stringify(events));
  assert.ok(!events.some(event=>event.type==='error'),JSON.stringify(events));
  const cues = events.filter(event=>event.type==='cue');assert.ok(cues.length,JSON.stringify(events));
  for (const cue of cues) {
    assert.ok(cue.startMs >= 1500 && cue.endMs > cue.startMs && cue.endMs <= audio.length/32);
    assert.ok(cue.text.trim());
  }
  const text = cues.map(cue=>cue.text).join(' ');
  if (/jfk/i.test(file)) {assert.match(text,/fellow Americans/i);assert.match(text,/country/i);}
  else assert.match(text,/1|one/i);
  const until = events.filter(event=>event.type==='progress').at(-1)?.untilMs;
  assert.ok(Math.abs(until-audio.length/32)<33,'Processed clock must match PCM time, including silence');
  assert.ok(Date.now()-started < 15000,'Recognition must prepare this audio faster than its playback duration');
  console.log(`PASS: ${cues.length} timestamped cues, silence-aware media clock ${until} ms, ${Date.now()-started} ms preparation`);
});
