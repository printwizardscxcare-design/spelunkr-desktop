'use strict';
const assert = require('node:assert/strict');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {setTimeout:delay} = require('node:timers/promises');
const {CaptionBridge} = require('../src/caption-bridge.cjs');
const {captionOptions} = require('../src/caption-options.cjs');
const [root,fixture] = process.argv.slice(2);
const options=captionOptions(root,process.platform,'whisper','fast');
const bridge=new CaptionBridge(options.executable,options);
let listening=false,failure='';const observed=[];
bridge.on('status',text=>{if(text.includes('Listening'))listening=true;});
bridge.on('failure',text=>{failure=text;});
bridge.on('caption',text=>observed.push(text));
async function waitFor(predicate,timeout){
  const deadline=Date.now()+timeout;
  while(!predicate()&&Date.now()<deadline&&!failure)await delay(80);
  assert.equal(failure,'');
  assert.ok(predicate(),'Timed out; observed captions: '+JSON.stringify(observed));
}
async function main(){
  try{
    bridge.start();await waitFor(()=>listening,45000);await delay(500);
    await promisify(execFile)('paplay',['--device=spelunkr_test',fixture],{timeout:30000});
    await waitFor(()=>observed.some(text=>/\b(one|1)\b/i.test(text)),45000);
    const recognizer=bridge.child,capture=bridge.source;
    await bridge.stop();
    assert.equal(bridge.child,null);assert.equal(bridge.source,null);
    assert.ok(recognizer.exitCode!==null||recognizer.signalCode!==null);
    assert.ok(capture.exitCode!==null||capture.signalCode!==null);
    console.log('PASS: production capture bridge, speaker-monitor recognition, idle handling, and process cleanup');
  }finally{await bridge.stop();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
