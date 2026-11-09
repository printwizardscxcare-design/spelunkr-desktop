'use strict';
// Look ahead 6 ms so hard starts/stops get short fades, including media pauses.
// Stereo shares one envelope. Steady audio retains its samples and level.
class TransitionGuard extends AudioWorkletProcessor {
  constructor() {
    super();this.delay=Math.ceil(sampleRate*.006);this.fade=Math.ceil(sampleRate*.004);
    this.size=this.delay+1;this.rings=[new Float32Array(this.size),new Float32Array(this.size)];
    this.attacks=new Float32Array(this.size);this.index=0;this.quiet=this.delay;
    this.last=-this.delay;this.start=0;
  }
  process(inputs,outputs) {
    const input=inputs[0]||[],output=outputs[0];
    for(let i=0;i<output[0].length;i++,this.index++) {
      const n=this.index,slot=n%this.size,read=(n+1)%this.size;
      const left=input[0]?.[i]||0,right=(input[1]||input[0])?.[i]||0;
      const sound=Math.max(Math.abs(left),Math.abs(right))>1e-7;
      if(sound) {if(this.quiet>=64)this.start=n;this.quiet=0;this.last=n;} else this.quiet++;
      this.rings[0][slot]=left;this.rings[1][slot]=right;
      this.attacks[slot]=Math.min(1,Math.max(0,(n-this.start)/this.fade));
      const tail=this.quiet>=64?Math.min(1,Math.max(0,(this.last-(n-this.delay))/this.fade)):1;
      const gain=this.attacks[read]*tail;
      for(let ch=0;ch<output.length;ch++)output[ch][i]=(this.rings[ch%2][read]||0)*gain;
    }
    return true;
  }
}
registerProcessor('spelunkr-transition-guard',TransitionGuard);
