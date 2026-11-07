'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {PassThrough,Readable,Writable} = require('node:stream');
const {CaptionReadAhead} = require('../src/caption-read-ahead.cjs');
const flush = () => new Promise(resolve=>setImmediate(resolve));
test('read-ahead is bounded, uses source-relative cue timestamps, and stops both processes',async () => {
  let written=0;const children=[];
  const spawnProcess = () => {
    const child=Object.assign(new EventEmitter(),{exitCode:null,signalCode:null,stdout:new PassThrough(),stderr:new PassThrough(),
      stdin:new Writable({highWaterMark:1,write(chunk,_encoding,callback){written+=chunk.length;callback();}}),kill(){this.signalCode='SIGTERM';this.emit('close',null);}});
    if (children.length===1) child.stdout=Readable.from(Array.from({length:40},()=>Buffer.alloc(32000)));
    children.push(child);return child;
  };
  const reader=new CaptionReadAhead({ffmpeg:'audio',helper:'speech',spawnProcess}),cues=[],ready=[];
  reader.on('cue',value=>cues.push(value));reader.on('ready',value=>ready.push(value));
  reader.start({session:1,startMs:85000,url:'https://archive.org/download/test/test.mp4'});await flush();
  assert.equal(written,24*32000,'Paused playback bounds decoding to the configured look-ahead window');
  assert.ok(children[0].listenerCount('close') <= 2,'Repeated pipe backpressure must not accumulate process listeners');
  children[0].stdout.write(JSON.stringify({type:'cue',text:'Speech',startMs:2000,endMs:4000})+'\n');
  assert.equal(cues[0].startMs,87000);assert.equal(cues[0].endMs,89000);
  children[0].stdout.write(JSON.stringify({type:'progress',untilMs:14999})+'\n');assert.equal(ready.length,0);
  children[0].stdout.write(JSON.stringify({type:'progress',untilMs:15000})+'\n');assert.equal(ready[0].untilMs,100000);
  reader.clock(9,100000);await flush();assert.equal(written,24*32000,'An old session cannot advance the active audio reader');
  reader.clock(1,90000);await flush();assert.equal(written,29*32000);
  reader.stop();await flush();assert.ok(children.every(child=>child.signalCode==='SIGTERM'));
  const previous=cues.length;children[0].stdout.write(JSON.stringify({type:'cue',text:'Late',startMs:0,endMs:1000})+'\n');assert.equal(cues.length,previous);
});
