'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const model = require('../src/controls-model.js');

test('default arrows are channels vertically and volume horizontally on every platform', () => {
  for (const platform of ['win32','darwin','linux']) {
    const config = model.config(model.defaults(platform),platform);
    for (const [code,id] of [['ArrowUp','channelNext'],['ArrowDown','channelPrevious'],['ArrowLeft','volumeDown'],['ArrowRight','volumeUp']]) assert.equal(model.keyAction({code},config),id);
  }
});
test('assignments preserve the other input type and move conflicts out of the old action', () => {
  const original = model.defaults();
  const key = model.normalizeBinding({type:'key',code:'ArrowUp'});
  const updated = model.assign(original.bindings,'mute',key);
  assert.deepEqual(updated.moved,['channelNext']);
  assert.equal(updated.bindings.channelNext.keyboard,null);
  assert.equal(updated.bindings.channelNext.gamepad.index,12);
  assert.equal(updated.bindings.mute.keyboard.code,'ArrowUp');
  assert.equal(original.bindings.channelNext.keyboard.code,'ArrowUp','Draft changes must not mutate saved settings');
  assert.doesNotThrow(()=>model.config({version:1,bindings:updated.bindings}));
});
test('settings validate input types, duplicates, action IDs and reserved shortcuts', () => {
  const defaults = model.defaults();
  const malformed = structuredClone(defaults);malformed.bindings.mute.keyboard=malformed.bindings.channelNext.keyboard;
  assert.throws(()=>model.config(malformed),/more than one/);
  assert.throws(()=>model.config({...defaults,bindings:{...defaults.bindings,'launch.exe':{}}}),/no longer available/);
  for(const value of [{type:'gamepad',kind:'axis',index:100,direction:1},{type:'key',code:'ControlLeft'},{type:'key',code:'F4',alt:true}]) assert.throws(()=>model.normalizeBinding(value));
  assert.equal(model.normalizeKey({code:'ShiftLeft'}),null);
  assert.throws(()=>model.normalizeBinding({type:'key',code:'Comma',ctrl:true}),/reserved/);
});
test('page actions use stable identities and reject non-HTTPS links', () => {
  const a=model.pageAction({label:'Toggle comments',match:{tag:'BUTTON',id:'comments',label:'Show comments'}});
  const b=model.pageAction({label:'Hide comments',match:{tag:'BUTTON',id:'comments',label:'Hide comments'}});
  assert.equal(a.id,b.id);
  assert.equal(model.pageAction({label:'Bad link',match:{tag:'A',href:'javascript:alert(1)'}}),null);
  assert.equal(model.pageAction({label:'Bad link',match:{tag:'A',href:'file:///C:/secret'}}),null);
  const next=model.config({version:1,bindings:model.defaults().bindings},'win32',[a]);
  const assigned=model.assign(next.bindings,a.id,model.normalizeBinding({type:'key',code:'F8'}));
  const serialized=model.config({version:1,bindings:assigned.bindings,pageActions:[a]});
  assert.equal(model.keyAction({code:'F8'},serialized),a.id);
});
function controller({button=-1,axis=0,mapping='standard',id='test pad'}={}) {
  return {index:0,id,mapping,connected:true,buttons:Array.from({length:17},(_,i)=>({pressed:i===button,value:i===button?1:0})),axes:[axis,0,0,0]};
}
test('controllers act on new presses, repeat held volume controls, and require release after focus changes', () => {
  const tracker=new model.GamepadTracker(), config=model.defaults();
  assert.deepEqual(tracker.sample([controller({button:15})],0),[]);
  tracker.sample([controller()],10);
  const press=tracker.sample([controller({button:15})],20);
  assert.equal(model.gamepadAction(press[0],config),'volumeUp');
  assert.equal(press[0].repeat,false);
  assert.deepEqual(tracker.sample([controller({button:15})],200),[]);
  assert.equal(tracker.sample([controller({button:15})],421)[0].repeat,true);
  tracker.reset();assert.deepEqual(tracker.sample([controller({button:15})],500),[]);
});
test('stick assignment uses a dead zone and hysteresis instead of controller drift', () => {
  const tracker=new model.GamepadTracker();tracker.sample([controller()],0);
  assert.deepEqual(tracker.sample([controller({axis:.4})],10),[]);
  const event=tracker.sample([controller({axis:.8})],20)[0];
  assert.equal(event.binding.kind,'axis');assert.equal(event.binding.direction,1);
  assert.deepEqual(tracker.sample([controller({axis:.5})],30),[]);
  tracker.sample([controller({axis:.2})],40);
  assert.equal(tracker.sample([controller({axis:.9})],50)[0].repeat,false);
  const config=model.defaults();config.bindings.volumeUp.gamepad=event.binding;
  assert.equal(model.gamepadAction(event,config),'volumeUp');
});
