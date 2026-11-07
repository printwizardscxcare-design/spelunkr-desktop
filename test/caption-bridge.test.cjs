'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {once} = require('node:events');
const {CaptionBridge} = require('../src/caption-bridge.cjs');
const {captionOptions} = require('../src/caption-options.cjs');

test('stopping streamed captions releases both recognition and capture before changing engines', async () => {
  const source = {executable:process.execPath,args:['-e', 'setInterval(()=>process.stdout.write(Buffer.alloc(1024)),20)'],failure:'Capture failed'};
  const receiver = ['-e', `process.stdin.once('data',()=>console.log(JSON.stringify({type:'caption',text:'test speech'})));process.stdin.on('data',()=>{});process.stdin.on('end',()=>process.exit(0))`];
  const bridge = new CaptionBridge(process.execPath,{args:receiver,capture:source});
  const failures=[];bridge.on('failure',text=>failures.push(text));
  try {
    const caption=once(bridge,'caption'); bridge.start();
    assert.equal((await caption)[0],'test speech');
    const recognition=bridge.child, capture=bridge.source;
    await bridge.stop();
    assert.equal(bridge.child,null); assert.equal(bridge.source,null);
    assert.ok(recognition.exitCode!==null||recognition.signalCode!==null);
    assert.ok(capture.exitCode!==null||capture.signalCode!==null);
    bridge.configure({executable:process.execPath,args:receiver,capture:source});
    const next=once(bridge,'caption');bridge.start();await next;await bridge.stop();
    assert.deepEqual(failures,[]);
  } finally {await bridge.stop();}
});

test('capture startup failures are reported once and recognition can be stopped', async () => {
  const bridge=new CaptionBridge(process.execPath,{args:['-e',"process.stdin.resume();setInterval(()=>{},1000)"],capture:{executable:'spelunkr-nonexistent-capture-test',args:[],failure:'Capture unavailable'}});
  const errors=[];bridge.on('failure',error=>errors.push(error));
  const failed=once(bridge,'failure');bridge.start();await failed;await bridge.stop();
  assert.deepEqual(errors,['Capture unavailable']);assert.equal(bridge.child,null);
});

test('cross-platform Whisper defaults always select output audio and Windows native captions stay optional',()=>{
  const windows=captionOptions('/native','win32');assert.ok(windows.args.includes('--wasapi'));
  const linux=captionOptions('/native','linux');assert.ok(linux.capture.args.includes('--device=@DEFAULT_MONITOR@'));
  const mac=captionOptions('/native','darwin');assert.ok(mac.capture.executable.endsWith('audiotee'));
  assert.deepEqual(mac.capture.args,['--sample-rate','16000']);
  assert.ok(captionOptions('/native','darwin','whisper','fast').args.includes('tiny.en'));
  assert.ok(captionOptions('/native','win32','windows').executable.endsWith('CaptionReader.exe'));
  assert.ok(captionOptions('/native','darwin','windows').executable.endsWith('caption-reader'));
});
