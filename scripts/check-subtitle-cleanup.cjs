'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');const {captionAudioFilter}=require('../src/caption-audio.cjs');
const [ffmpeg,helper,fixture,outputDirectory]=process.argv.slice(2);fs.mkdirSync(outputDirectory,{recursive:true});
const run=(args,input)=>execFileSync(ffmpeg,['-nostdin','-hide_banner','-loglevel','error',...args],{input,windowsHide:true,timeout:30000,maxBuffer:16*1024*1024});
const original=run(['-i',fixture,'-ac','1','-ar','16000','-f','s16le','pipe:1']);
let seed=41;const noisy=Buffer.from(original);
for(let i=0;i<noisy.length;i+=2){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed/4294967296-.5)*2000;noisy.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(original.readInt16LE(i)*.6+noise+2500))),i);}
const transcripts=[];
for(const [label,pcm,cleanup] of [['clean',original,false],['noisy',noisy,false],['cleaned',noisy,true]]){
  const filtered=run(['-f','s16le','-ar','16000','-ac','1','-i','pipe:0','-af',captionAudioFilter(cleanup),'-f','s16le','pipe:1'],pcm);
  assert.equal(filtered.length,original.length,'Subtitle cleanup preserves duration');
  const wave=path.join(outputDirectory,`${label}.wav`);
  run(['-y','-f','s16le','-ar','16000','-ac','1','-i','pipe:0',wave],filtered);
  const response=execFileSync(helper,['--test-wav',wave,'--model','tiny.en'],{encoding:'utf8',windowsHide:true,timeout:180000});
  const text=response.trim().split('\n').map(s=>JSON.parse(s)).filter(e=>e.type==='caption').map(e=>e.text).join(' ');
  assert.match(text,/country/i,'Speech is still recognized');transcripts.push({label,text});
}
fs.writeFileSync(path.join(outputDirectory,'transcripts.json'),JSON.stringify(transcripts,null,2));console.log(JSON.stringify(transcripts,null,2));
console.log('PASS: independent cleanup, speech retained, unchanged sample duration. This fixture is not a broad accuracy benchmark.');
