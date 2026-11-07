'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const install = require('../src/caption-buffer-renderer.cjs');
const {CaptionCache} = require('../src/caption-cache.cjs');
function setup({siteControls = false} = {}) {
  const handlers = new Map(),events = new Map(),sent = [];
  let tick;
  const video = {currentTime:100,currentSrc:'https://archive.org/download/test/test.mp4',paused:false,seekable:{length:1,start:()=>0},
    pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}};
  const ipcRenderer = {on:(key,callback)=>handlers.set(key,callback),send:(...args)=>sent.push(args)};
  let sitePaused = false,pauseClicks = 0;
  const pauseButton = {getAttribute:()=>sitePaused ? 'Play (Space)' : 'Pause (Space)',click(){
    sitePaused=!sitePaused;pauseClicks++;
    if (sitePaused) video.pause();
    else {video.currentTime+=1.8;video.play();queueMicrotask(()=>{events.get('seeking')?.({target:video});events.get('seeked')?.({target:video});});}
  }};
  const rewindButton = {click(){video.currentTime-=15;queueMicrotask(()=>events.get('seeked')?.({target:video}));}};
  const document = {querySelector:selector=>siteControls && selector === '.dvr-pause-btn' ? pauseButton : siteControls && selector === '#stage-key-rw' ? rewindButton : video,
    addEventListener:(key,callback)=>events.set(key,callback)};
  const window = {setInterval:callback=>{tick=callback;return 1;},clearInterval(){},addEventListener(){}};
  const renderer = install({ipcRenderer,document,window,cache:new CaptionCache(),onChange(){}});
  return {video,sent,renderer,userToggle:()=>pauseButton.click(),pauseClicks:()=>pauseClicks,tick:()=>tick(),event:key=>events.get(key)?.({target:video}),send:(key,value)=>handlers.get(key)({},value),
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
