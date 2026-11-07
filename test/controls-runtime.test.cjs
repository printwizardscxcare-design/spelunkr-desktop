'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../src/controls-model.js');
const install=require('../src/controls-runtime.cjs');
function setup() {
  const ipc=new Map(), listeners=new Map(), sent=[], dispatched=[], frames=[];
  const player={volume:.5,muted:false,currentTime:45,duration:100};
  const slider={value:'.5',events:[],dispatchEvent(event){this.events.push(event.type);player.volume=Number(this.value);}};
  let focused=true, active=null, buttons=[];
  const document={readyState:'complete',visibilityState:'visible',hasFocus:()=>focused,get activeElement(){return active;},
    querySelector:selector=>selector.includes('volume-slider')?slider:selector.includes('video')?player:null,
    querySelectorAll:selector=>selector==='[role="dialog"]'?[]:buttons};
  class Event {constructor(type,options){this.type=type;Object.assign(this,options);}}
  const window={Event,KeyboardEvent:Event,addEventListener:(type,fn)=>listeners.set(type,fn),dispatchEvent:event=>dispatched.push(event),requestAnimationFrame:fn=>frames.push(fn)};
  let pads=[];
  const runtime=install({model,ipcRenderer:{on:(name,fn)=>ipc.set(name,fn),send:(...args)=>sent.push(args)},document,window,navigator:{getGamepads:()=>pads},platform:'win32'});
  return {runtime,player,slider,dispatched,sent,ipc,frames,setFocused:value=>{focused=value;},setActive:value=>{active=value;},setPads:value=>{pads=value;},setButtons:value=>{buttons=value;},
    key(code,overrides={}){const e={code,isTrusted:true,target:{closest:()=>null},preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...overrides};listeners.get('keydown')(e);return e;}};
}
test('horizontal keys change and clamp the real volume slider instead of seeking',()=>{
  const h=setup();h.key('ArrowLeft');assert.equal(h.player.volume,.45);assert.equal(h.player.currentTime,45);
  h.key('ArrowRight');assert.equal(h.player.volume,.5);assert.deepEqual(h.slider.events,['input','change','input','change']);
  for(let i=0;i<30;i++)h.key('ArrowRight',{repeat:true});assert.equal(h.player.volume,1);
});
test('saved bindings replace defaults, suppress legacy shortcuts, and ignore untrusted page events',()=>{
  const h=setup(), base=model.defaults();
  const assigned=model.assign(base.bindings,'channelNext',model.normalizeBinding({type:'key',code:'KeyZ'}));
  h.ipc.get('desktop:controls-state')({}, {config:{version:1,bindings:assigned.bindings},suspended:false});
  assert.ok(h.key('ArrowUp').prevented);assert.equal(h.dispatched.length,0);
  h.key('KeyZ',{isTrusted:false});assert.equal(h.dispatched.length,0);
  h.key('KeyZ');assert.equal(h.dispatched.at(-1).key,'ChannelUp');
  h.key('KeyZ',{target:{isContentEditable:true}});assert.equal(h.dispatched.length,1);
});
test('settings suspend commands and controller capture cannot trigger playback behind the dialog',()=>{
  const h=setup();h.ipc.get('desktop:controls-state')({}, {config:model.defaults(),suspended:true});
  h.key('ArrowUp');assert.equal(h.dispatched.length,0);
  h.key('KeyL',{ctrlKey:true,shiftKey:true});assert.equal(h.sent.filter(x=>x[0]==='controls:action').length,0);
});
test('native commands use a fixed action ID and page controls click only the saved match',()=>{
  const h=setup();h.key('KeyL',{ctrlKey:true,shiftKey:true});assert.deepEqual(h.sent.at(-1),['controls:action','captions']);
  let clicks=0;const element={tagName:'BUTTON',id:'test-action',textContent:'A page action',getAttribute:()=>null,click(){clicks++;}};
  h.setButtons([element]);h.ipc.get('desktop:controls-query')();
  const action=h.sent.at(-1)[1][0];
  const base=model.defaults();const bindings=model.assign(base.bindings,action.id,model.normalizeBinding({type:'key',code:'F8'})).bindings;
  h.ipc.get('desktop:controls-state')({}, {config:{version:1,bindings,pageActions:[action]},suspended:false});
  h.key('F8');assert.equal(clicks,1);
  h.setButtons([]);h.key('F8');assert.equal(clicks,1);
});
