'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const m=require('../src/audio-model.js');
test('normalizer settles quiet/loud programs toward the same level without boosting silence',()=>{
  const settle=(rms,peak,volume=1,previous=0)=>{for(let i=0;i<500;i++)previous=m.normalization({rms,peak,volume,previous});return previous;};
  const quiet=settle(.06,.12), loud=settle(.3,.6);
  assert.ok(Math.abs(20*Math.log10(.06)+quiet+14)<.05);
  assert.ok(Math.abs(20*Math.log10(.3)+loud+14)<.05);
  assert.equal(settle(0,0,1,quiet),quiet,'Silence does not build gain');
  assert.equal(settle(.0001,.0002,1,quiet),quiet,'Tape noise below the gate does not build gain');
  assert.ok(Math.abs(settle(.015,.03,.25)-quiet)<.05,'The volume knob does not change the normalization target');
  assert.equal(settle(.06,.12,0,quiet),quiet,'Mute freezes gain');
  assert.ok(m.normalization({rms:.3,peak:.6,previous:quiet})<quiet-3,'Loud commercials turn down promptly');
  assert.ok(settle(.001,.002)<=12,'Quiet boost is bounded');
});
test('pairing and independent makeup, effect order and bounded settings survive serialization',()=>{
  const s=m.settings({normalize:true,compression:true,eq:true,amount:80,position:'post',bands:[999,NaN,-999]});
  assert.equal(s.makeup,4.8);assert.equal(s.position,'post');assert.deepEqual(s.bands.slice(0,3),[12,0,-12]);
  const unpaired=m.settings({...s,linked:false,makeup:-3});assert.equal(unpaired.makeup,-3);
  const config=m.config({current:unpaired,presets:[{name:'Saturday Morning',settings:unpaired}]});
  assert.deepEqual(m.config(JSON.parse(JSON.stringify(config))),config);
  assert.equal(m.settings({amount:'100',makeup:Infinity}).amount,35);
  assert.equal(m.settings({position:'other'}).position,'pre');
  assert.equal(m.config({presets:[{name:'Rabbit Ears'},{name:'  Mine  '},{name:'mine'}]}).presets.length,1);
  assert.equal(m.active(m.defaults()),false);
  assert.equal(m.active(m.settings({enabled:false,normalize:true,compression:true,eq:true})),false);
});

test('ordinary audio stays audible and isolated peaks do not duck the program',()=>{
  const run=peak=>{let previous=0;for(let i=0;i<500;i++)previous=m.normalization({rms:.2,peak,previous});return previous;};
  assert.ok(run(.4)>-.1);assert.ok(Math.abs(run(.99)-run(.4))<.001);
  assert.ok(m.normalization({rms:1,peak:1,previous:0})<0,'Sustained loud programs are reduced');
});
