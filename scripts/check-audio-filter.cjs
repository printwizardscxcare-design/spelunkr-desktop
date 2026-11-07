'use strict';
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const [ffmpeg,fixture] = process.argv.slice(2);
const wav = fs.readFileSync(fixture);let audio;
for (let at=12;at+8<=wav.length;) {const size=wav.readUInt32LE(at+4);if(wav.toString('ascii',at,at+4)==='data'){audio=Buffer.from(wav.subarray(at+8,at+8+size));break;}at+=8+size+(size%2);}
assert.ok(audio);
// Reproduce the DC-biased tape audio found during the live channel check.
for (let at=0;at+1<audio.length;at+=2) audio.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(audio.readInt16LE(at)*.2+16000))),at);
const filtered = execFileSync(ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-f','s16le','-ar','16000','-ac','1','-i','pipe:0','-af','highpass=f=60','-f','s16le','pipe:1'],
  {input:audio,windowsHide:true,timeout:15000,maxBuffer:16*1024*1024});
let sum=0,energy=0;
for (let at=3200;at+1<filtered.length;at+=2) {const sample=filtered.readInt16LE(at)/32768;sum+=sample;energy+=sample*sample;}
const samples=(filtered.length-3200)/2;
assert.ok(Math.abs(sum/samples)<.005,'DC bias must be removed');assert.ok(energy/samples>.000001,'Speech must remain');
assert.equal(filtered.length,audio.length,'Cleanup must preserve the media clock');
console.log('PASS: tape-audio DC removal, speech energy, and unchanged sample duration');
