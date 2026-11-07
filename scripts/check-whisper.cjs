'use strict';
const {execFileSync, spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {once} = require('node:events');
const {setTimeout: delay} = require('node:timers/promises');
const [helper, fixture] = process.argv.slice(2);
const benchmarks=[];
const numberWords = {zero:'0',oh:'0',o:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9'};
const digits = text => (text.toLowerCase().match(/[a-z]+|\d+/g)||[]).map(word => numberWords[word] || (/^\d+$/.test(word) ? word : '')).join('');
for (const model of ['base.en','tiny.en']) {
  let output;
  try { output=execFileSync(helper,['--test-wav',fixture,'--model',model],{encoding:'utf8',timeout:180000}); }
  catch(error) {throw new Error(String(error.stdout)+String(error.stderr));}
  const events=output.trim().split('\n').map(line=>JSON.parse(line));
  assert.ok(events.some(event=>event.type==='caption'&&digits(event.text).includes('10001')),output);
  const timing=events.find(event=>event.type==='status'&&event.text.startsWith('Benchmark:'))?.text;
  benchmarks.push(`${process.platform}/${process.arch} ${model}: ${timing}`);
}
const speechFixture = path.join(path.dirname(fixture), 'jfk.wav');
if (fs.existsSync(speechFixture)) {
  {
    const output = execFileSync(helper, ['--test-wav', speechFixture, '--model', 'tiny.en'], {encoding:'utf8', timeout:180000});
    const events = output.trim().split('\n').map(line => JSON.parse(line));
    const text = events.filter(event => event.type === 'caption').map(event => event.text).join(' ');
    assert.match(text, /fellow Americans/i);
    assert.match(text, /country/i);
    assert.match(text, /what you can do for your country/i);
    benchmarks.push(`${process.platform}/${process.arch} tiny English speech: ${events.find(event => event.text.startsWith('Benchmark:'))?.text}`);
  }
}
console.log(benchmarks.join('\n'));
if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n### Packaged Whisper CPU benchmarks\n\n'+benchmarks.map(line=>'- '+line).join('\n')+'\n\nThese use the CI computer and a short recorded fixture; they do not predict every user computer.\n');

async function streamCheck() {
  const wav=fs.readFileSync(fixture);let pcm;
  for(let offset=12;offset+8<=wav.length;) {
    const size=wav.readUInt32LE(offset+4);
    if(wav.toString('ascii',offset,offset+4)==='data'){pcm=wav.subarray(offset+8,offset+8+size);break;}
    offset+=8+size+(size%2);
  }
  assert.ok(pcm,'Missing PCM fixture');
  const child=spawn(helper,['--pcm','--model','tiny.en'],{stdio:['pipe','pipe','pipe']});
  let buffer='',failure='',listening=false,speechStartedAt=null,firstSpeechMs=null,firstCaptionMs=null;const captions=[],activity=[];
  child.stdout.setEncoding('utf8');child.stdout.on('data',data=>{
    buffer+=data;let newline;
    while((newline=buffer.indexOf('\n'))>=0){
      const event=JSON.parse(buffer.slice(0,newline));buffer=buffer.slice(newline+1);
      if(event.type==='error')failure=event.text;
      if(event.type==='caption') {
        captions.push(event.text);
        if(speechStartedAt!==null && firstCaptionMs===null) firstCaptionMs=Date.now()-speechStartedAt;
      }
      if(event.type==='activity') {
        activity.push(event.text);
        if(event.text==='speech' && speechStartedAt!==null && firstSpeechMs===null)firstSpeechMs=Date.now()-speechStartedAt;
      }
      if(event.type==='status'&&event.text.includes('Listening'))listening=true;
    }
  });
  child.stderr.resume();child.stdin.on('error',()=>{});
  const closed=once(child,'close');
  async function feed(bytes) {
    for(let offset=0;offset<bytes.length;offset+=1024){
      assert.equal(failure,'');assert.equal(child.exitCode,null,'Recognizer exited early');
      if(!child.stdin.write(bytes.subarray(offset,offset+1024)))await once(child.stdin,'drain');
      await delay(32);
    }
  }
  try {
    const limit=Date.now()+30000;
    while(!listening&&Date.now()<limit&&!failure&&child.exitCode===null)await delay(50);
    assert.ok(listening,failure||'Recognizer did not start');
    await feed(Buffer.alloc(64000)); // Silence must not create invented captions.
    assert.deepEqual(captions,[]);
    speechStartedAt=Date.now();
    await feed(pcm);
    await feed(Buffer.alloc(192000)); // Allow the last phrase and short inference queue to finish.
    assert.equal(failure,'');
    assert.ok(captions.some(text=>digits(text).includes('1')),JSON.stringify(captions));
    assert.ok(activity.includes('speech')&&activity.includes('silence'),JSON.stringify(activity));
    const recognitionDelay=firstCaptionMs-firstSpeechMs;
    assert.ok(firstCaptionMs!==null && firstSpeechMs!==null && recognitionDelay<3000,`First caption took ${recognitionDelay} ms after speech detection; expected less than 3000 ms for the packaged fixture`);
    console.log(`Fast stream: first caption ${recognitionDelay} ms after speech detection (${firstCaptionMs} ms into fixture playback)`);
    if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\nFast stream: first caption ${recognitionDelay} ms after speech detection (${firstCaptionMs} ms into recorded-fixture playback).\n`);
    child.stdin.end();
    const result=await Promise.race([closed,delay(5000).then(()=>{throw Error('PCM EOF did not stop capture recognition');})]);
    assert.equal(result[0],0);
    console.log('PASS: packaged base/tiny models, silent-audio rejection, streaming speech recognition, and EOF cleanup');
  } finally {if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');}
}
streamCheck().catch(error=>{console.error(error);process.exitCode=1;});
