'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function processAudio(amount,createSample,seconds=4) {
  let Processor;
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/denoise-worklet.js'),'utf8'),{
    AudioWorkletProcessor:class {constructor(){this.port={};}},sampleRate:48000,registerProcessor:(_name,type)=>{Processor=type;}
  });
  const p=new Processor(), length=Math.ceil(seconds*48000/128)*128,original=new Float32Array(length),output=new Float32Array(length);
  for(let offset=0;offset<length;offset+=128){const input=new Float32Array(128),left=new Float32Array(128),right=new Float32Array(128);
    for(let i=0;i<128;i++)input[i]=original[offset+i]=createSample(offset+i);
    p.process([[input]],[[left,right]],{amount:[amount]});output.set(left,offset);
    assert.deepEqual(right,left,'Mono remains centered');
  }
  return {original,output};
}
const rms=a=>Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length);
test('spectral overlap/add is transparent with reduction zero and has a fixed 1023-sample delay',()=>{
  const {original,output}=processAudio(0,i=>.2*Math.sin(2*Math.PI*1000*i/48000));
  let max=0;for(let i=4096;i<output.length;i++)max=Math.max(max,Math.abs(output[i]-original[i-1023]));
  assert.ok(max<1e-6,`Reconstruction error ${max}`);
});
test('denoiser reduces steady broadband hiss and preserves a changing foreground tone',()=>{
  let seed=41;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed/4294967296-.5)*.035;};
  const {original,output}=processAudio(80,i=>noise()+(i>48000*2?.18*Math.sin(2*Math.PI*(500+i/48000*130)*i/48000):0));
  const before=rms(original.slice(48000,90000)),after=rms(output.slice(49023,91023));
  assert.ok(after<before*.65,`Noise reduction ${20*Math.log10(after/before)} dB`);
  const speech=rms(output.slice(48000*3));assert.ok(speech>.08,`Foreground retained ${speech}`);
  assert.ok(output.every(Number.isFinite));
});
