'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const install = require('../src/caption-buffer-renderer.cjs');
const {CaptionCache} = require('../src/caption-cache.cjs');
function setup({siteControls = false} = {}) {
  const handlers = new Map(),events = new Map(),sent = [];
  let tick, clock = 0, tuning = false;
  const windowEvents = new Map();
  const video = {currentTime:100,currentSrc:'https://archive.org/download/test/test.mp4',readyState:4,paused:false,seekable:{length:1,start:()=>0},
    pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}};
  const ipcRenderer = {on:(key,callback)=>handlers.set(key,callback),send:(...args)=>sent.push(args)};
  let sitePaused = false,pauseClicks = 0;
  const pauseButton = {getAttribute:()=>sitePaused ? 'Play (Space)' : 'Pause (Space)',click(){
    sitePaused=!sitePaused;pauseClicks++;
    if (sitePaused) video.pause();
    else {video.currentTime+=1.8;video.play();queueMicrotask(()=>{events.get('seeking')?.({target:video});events.get('seeked')?.({target:video});});}
  }};
  const rewindButton = {click(){video.currentTime-=15;queueMicrotask(()=>events.get('seeked')?.({target:video}));}};
  const document = {querySelector:selector=>selector === '.tuning-slate' ? tuning ? {getClientRects:()=>[{}]} : null : siteControls && selector === '.dvr-pause-btn' ? pauseButton : siteControls && selector === '#stage-key-rw' ? rewindButton : video,
    addEventListener:(key,callback)=>events.set(key,callback)};
  const window = {location:{pathname:'/first-channel'},setInterval:callback=>{tick=callback;return 1;},clearInterval(){},addEventListener:(key,callback)=>windowEvents.set(key,callback)};
  const renderer = install({ipcRenderer,document,window,cache:new CaptionCache(),onChange(){},now:()=>clock});
  return {video,sent,renderer,tuning:value=>{tuning=value;},route:pathname=>{window.location.pathname=pathname;windowEvents.get('spelunkr:navigate')();},userToggle:()=>pauseButton.click(),pauseClicks:()=>pauseClicks,tick:(elapsed=0)=>{clock+=elapsed;tick();},event:key=>events.get(key)?.({target:video}),send:(key,value)=>handlers.get(key)({},value),
    source:()=>sent.filter(([key])=>key==='buffer:source').at(-1)[1],render:()=>renderer.render(50,s=>s.length)?.text};
}
test('activation rewinds once and waits for 15 seconds of recognized media before resuming',() => {
  const h=setup();h.send('desktop:caption-buffer',{enabled:true,speed:'fast',rewind:true});
  const source=h.source();assert.equal(source.startMs,85000);assert.equal(h.video.currentTime,85);assert.equal(h.video.paused,true);
  assert.equal(h.render(),'Preparing subtitles…');
  h.send('desktop:buffer-progress',{session:source.session,untilMs:99999});assert.equal(h.video.paused,true);
  h.send('desktop:buffer-cue',{session:source.session,startMs:87000,endMs:89000,text:'Cached speech'});
  h.send('desktop:buffer-progress',{session:source.session,untilMs:100000});assert.equal(h.video.paused,false);
  assert.equal(h.render(),'');h.video.currentTime=87;assert.equal(h.render(),'Cached speech');
  h.video.currentTime=89;assert.equal(h.render(),'');
  h.send('desktop:caption-buffer',{enabled:true,speed:'fast',delayMs:1000});
  assert.equal(h.video.currentTime,89);assert.equal(h.render(),'Cached speech');assert.equal(h.sent.filter(([key])=>key==='buffer:source').length,1);
});

test('channel surfing restarts the countdown and only prepares the final channel',() => {
  const h=setup();h.send('desktop:caption-buffer',{enabled:true,rewind:true});const old=h.source();
  h.send('desktop:buffer-ready',{session:old.session,untilMs:110000});
  h.renderer.channelChanged();
  h.video.currentSrc='https://archive.org/download/second/second.mp4';h.video.currentTime=40;h.tick();
  assert.equal(h.renderer.cooldown(),5);assert.equal(h.video.paused,false);assert.equal(h.render(),'');
  h.tick(4000);assert.equal(h.renderer.cooldown(),1);
  h.video.currentSrc='https://archive.org/download/third/third.mp4';h.video.currentTime=60;h.tick();
  assert.equal(h.renderer.cooldown(),5);
  h.send('desktop:buffer-cue',{session:old.session,startMs:60000,endMs:70000,text:'Wrong channel'});
  h.send('desktop:buffer-ready',{session:old.session,untilMs:200000});
  h.tick(4999);assert.equal(h.sent.filter(([key])=>key==='buffer:source').length,1);
  assert.equal(h.video.paused,false);assert.equal(h.render(),'');
  h.tick(1);const next=h.source();assert.match(next.url,/third/);assert.equal(next.startMs,60000);
  assert.equal(h.renderer.cooldown(),0);assert.equal(h.video.paused,true);assert.equal(h.render(),'Preparing subtitles…');
  h.send('desktop:buffer-progress',{session:next.session,untilMs:74999});assert.equal(h.video.paused,true);
  h.send('desktop:buffer-progress',{session:next.session,untilMs:75000});assert.equal(h.video.paused,false);
  assert.equal(h.render(),'');assert.equal(h.sent.filter(([key])=>key==='buffer:source').length,2);
});

test('the full five-second cooldown starts only after tuning finishes and media is ready',() => {
  const h=setup();h.send('desktop:caption-buffer',{enabled:true});
  h.renderer.channelChanged();h.video.currentSrc='https://archive.org/download/second/second.mp4';h.video.currentTime=200;
  h.tuning(true);h.tick(12000);
  assert.equal(h.renderer.waitingForTune(),true);assert.equal(h.renderer.cooldown(),0);assert.equal(h.video.paused,false);
  assert.equal(h.sent.filter(([key])=>key==='buffer:source').length,1);
  h.tuning(false);h.video.readyState=2;h.tick(10000);assert.equal(h.renderer.waitingForTune(),true);
  h.video.readyState=4;h.video.seeking=true;h.tick(10000);assert.equal(h.renderer.waitingForTune(),true);
  h.video.seeking=false;h.tick();assert.equal(h.renderer.waitingForTune(),false);assert.equal(h.renderer.cooldown(),5);
  h.tick(4999);assert.equal(h.sent.filter(([key])=>key==='buffer:source').length,1);
  h.tick(1);assert.equal(h.source().startMs,200000);assert.equal(h.video.paused,true);
});

test('retuning or changing channels during the countdown starts a fresh cooldown after readiness',() => {
  const h=setup();h.send('desktop:caption-buffer',{enabled:true});h.renderer.channelChanged();h.tick();h.tick(4000);
  assert.equal(h.renderer.cooldown(),1);h.tuning(true);h.tick(10000);
  assert.equal(h.renderer.waitingForTune(),true);assert.equal(h.renderer.cooldown(),0);
  h.video.currentSrc='https://archive.org/download/third/third.mp4';h.tick(10000);
  h.tuning(false);h.tick();assert.equal(h.renderer.cooldown(),5);
  h.tick(4999);assert.equal(h.sent.filter(([key])=>key==='buffer:source').length,1);
  h.tick(1);assert.match(h.source().url,/third/);
});

test('route changes restart the countdown even before the new media arrives',() => {
  const h=setup();h.send('desktop:caption-buffer',{enabled:true});
  h.route('/second-channel');h.tick();assert.equal(h.renderer.cooldown(),5);
  h.tick(3000);h.route('/third-channel');h.tick();assert.equal(h.renderer.cooldown(),5);
  h.route('/third-channel');h.tick(1000);assert.equal(h.renderer.cooldown(),4);
  assert.equal(h.sent.filter(([key])=>key==='buffer:source').length,1);
});

test('cooldown can be 30 seconds or off, and changing it never adds another rewind',() => {
  const h=setup();h.send('desktop:caption-buffer',{enabled:true,cooldownSeconds:30});
  h.renderer.channelChanged();h.tick();assert.equal(h.renderer.cooldown(),30);h.tick(29000);assert.equal(h.renderer.cooldown(),1);
  h.send('desktop:caption-buffer',{enabled:true,cooldownSeconds:0});h.tick();
  assert.equal(h.renderer.cooldown(),0);assert.equal(h.source().startMs,100000);
  h.video.currentSrc='https://archive.org/download/second/second.mp4';h.tick();
  assert.match(h.source().url,/second/);assert.equal(h.renderer.cooldown(),0);
});

test('off cancels a pending countdown, and channel changes while off do no work',() => {
  const h=setup();h.send('desktop:caption-buffer',{enabled:true});h.renderer.channelChanged();
  h.send('desktop:caption-buffer',{enabled:false,active:false});const count=h.sent.length;
  h.video.currentSrc='https://archive.org/download/second/second.mp4';h.renderer.channelChanged();h.tick(31000);
  assert.equal(h.renderer.cooldown(),0);assert.equal(h.renderer.render(50,s=>s.length),null);assert.equal(h.sent.length,count);
});

test('Windows native captions get cooldown notifications without starting Whisper',() => {
  const h=setup();h.send('desktop:caption-buffer',{enabled:false,active:true,cooldownSeconds:5});
  h.video.currentSrc='https://archive.org/download/second/second.mp4';h.tick();
  assert.equal(h.renderer.cooldown(),5);assert.equal(h.render(),'');assert.equal(h.video.paused,false);
  h.tick(5000);assert.equal(h.renderer.cooldown(),0);
  assert.equal(h.sent.filter(([key])=>key==='buffer:source').length,0);
  assert.deepEqual(h.sent.filter(([key])=>key==='buffer:cooldown').map(([,value])=>value),[true,false]);
});

test('a seek within the same channel prepares immediately without a surfing countdown',() => {
  const h=setup();h.send('desktop:caption-buffer',{enabled:true,rewind:true});const first=h.source();
  h.event('seeked');h.send('desktop:buffer-ready',{session:first.session,untilMs:110000});
  h.video.currentTime=150;h.event('seeking');
  assert.equal(h.renderer.cooldown(),0);assert.equal(h.source().startMs,150000);
});

test('surfing while the old channel buffers releases its playback and preserves a user pause on the new channel',() => {
  const h=setup();h.send('desktop:caption-buffer',{enabled:true});assert.equal(h.video.paused,true);
  h.renderer.channelChanged();assert.equal(h.video.paused,false);
  h.video.currentSrc='https://archive.org/download/second/second.mp4';h.tick();
  h.video.paused=true;h.tick(5000);const next=h.source();
  h.send('desktop:buffer-ready',{session:next.session,untilMs:115000});assert.equal(h.video.paused,true);
});
test('seeks replace the cache without another 15-second rewind and ignore late old cues',() => {
  const h=setup();h.send('desktop:caption-buffer',{enabled:true,rewind:true});const old=h.source();
  h.event('seeked');h.send('desktop:buffer-ready',{session:old.session,untilMs:110000});
  h.video.currentTime=150;h.event('seeking');const next=h.source();assert.notEqual(next.session,old.session);assert.equal(next.startMs,150000);
  h.send('desktop:buffer-cue',{session:old.session,startMs:150000,endMs:160000,text:'Stale'});
  h.send('desktop:buffer-ready',{session:old.session,untilMs:200000});assert.equal(h.video.paused,true);
  h.send('desktop:buffer-ready',{session:next.session,untilMs:165000});assert.equal(h.video.paused,false);assert.equal(h.render(),'');
});
test('falling behind pauses video to replenish the buffer; off restores playback and clears text',() => {
  const h=setup();h.send('desktop:caption-buffer',{enabled:true,rewind:true});const source=h.source();
  h.send('desktop:buffer-ready',{session:source.session,untilMs:100000});h.video.currentTime=99;h.tick();assert.equal(h.video.paused,true);
  h.send('desktop:buffer-progress',{session:source.session,untilMs:114000});assert.equal(h.video.paused,false);
  h.video.currentTime=113;h.tick();assert.equal(h.video.paused,true);
  h.send('desktop:caption-buffer',{enabled:false});assert.equal(h.video.paused,false);assert.equal(h.renderer.render(50,s=>s.length),null);
});
test('a user pause stays paused after initial preparation and shorter remaining media can finish buffering',() => {
  const h=setup();h.video.paused=true;h.send('desktop:caption-buffer',{enabled:true,rewind:true});const source=h.source();
  h.send('desktop:buffer-complete',{session:source.session,untilMs:90000});assert.equal(h.video.paused,true);assert.equal(h.render(),'');
});

test('buffering uses site playback controls and preserves cached cues across the site resume seek',async () => {
  const h=setup({siteControls:true});h.send('desktop:caption-buffer',{enabled:true,rewind:true});await Promise.resolve();
  const source=h.source();assert.equal(source.startMs,85000);assert.equal(h.pauseClicks(),1);
  h.send('desktop:buffer-cue',{session:source.session,startMs:86000,endMs:89000,text:'Prepared speech'});
  h.send('desktop:buffer-ready',{session:source.session,untilMs:101000});await Promise.resolve();
  assert.equal(h.pauseClicks(),2);assert.equal(h.video.paused,false);assert.equal(h.render(),'Prepared speech');
  assert.equal(h.sent.filter(([key])=>key==='buffer:source').length,1,'The site resume seek must not restart recognition');
  h.tick();h.userToggle();h.tick();assert.equal(h.render(),'');
  h.userToggle();await Promise.resolve();
  assert.equal(h.sent.filter(([key])=>key==='buffer:source').length,1,'User pause/resume must reuse the prepared cache');
});

test('temporary subtitle failures resume playback and retry automatically without another rewind',()=>{
  const h=setup();h.send('desktop:caption-buffer',{enabled:true,rewind:true});const original=h.source();
  h.send('desktop:buffer-failure');assert.equal(h.video.paused,false);assert.equal(h.render(),'Subtitles reconnecting…');
  h.tick(4999);assert.equal(h.source().session,original.session);
  h.tick(1);assert.notEqual(h.source().session,original.session);assert.equal(h.source().startMs,85000);
  const next=h.source();h.send('desktop:buffer-ready',{session:next.session,untilMs:100000});
  assert.equal(h.video.paused,false);
  h.send('desktop:buffer-failure');h.send('desktop:caption-buffer',{enabled:false});h.tick(60000);
  assert.equal(h.source().session,next.session,'Off cancels retry');
});
