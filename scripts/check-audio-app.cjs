'use strict';
// Run with Electron. Tests the actual Chromium audio graph and settings window.
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {createAudioManager}=require('../src/audio-manager.cjs');
const root=path.join(__dirname,'..'),profile=path.join(root,'dist/audio-check-profile');
app.setPath('userData',profile);app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const embed=file=>`(()=>{const module={exports:{}};${fs.readFileSync(path.join(root,'src',file),'utf8')}\nreturn module.exports;})()`;
app.whenReady().then(async()=>{
  let player,manager;
  try {
    player=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});player.webContents.setAudioMuted(true);
    fs.writeFileSync(path.join(root,'dist/audio-check.html'),'<!doctype html><title>Audio checks</title>');
    await player.loadFile(path.join(root,'dist/audio-check.html'));
    await player.webContents.executeJavaScript(`window.model=${embed('audio-model.js')};window.createGraph=${embed('audio-graph.cjs')};window.workletSource=${JSON.stringify(fs.readFileSync(path.join(root,'src/denoise-worklet.js'),'utf8'))};`);
    const result=await player.webContents.executeJavaScript(`(async()=>{
      async function render(settings){
        const c=new OfflineAudioContext(2,48000,48000),s=c.createBufferSource(),buffer=c.createBuffer(2,48000,48000);
        for(let ch=0;ch<2;ch++)for(let i=0;i<48000;i++)buffer.getChannelData(ch)[i]=.3*Math.sin(2*Math.PI*1000*i/48000);
        s.buffer=buffer;
        const url=URL.createObjectURL(new Blob([workletSource],{type:'text/javascript'}));await c.audioWorklet.addModule(url);URL.revokeObjectURL(url);
        const denoiser=new AudioWorkletNode(c,'spelunkr-tape-denoiser',{outputChannelCount:[2]});
        createGraph(c,s,model,denoiser).apply(settings,true);s.start();const output=await c.startRendering();
        const values=output.getChannelData(0).slice(24000);return Math.sqrt(values.reduce((a,v)=>a+v*v,0)/values.length);
      }
      const flat=model.defaults(),base=await render(flat);
      const boosted={...flat,eq:true,bands:flat.bands.map((_,i)=>i===0?12:0),compression:true,linked:false,makeup:0,amount:90};
      const pre=await render({...boosted,position:'pre'}),post=await render({...boosted,position:'post'});
      const denoise=await render({...flat,denoise:50});
      return {base,pre,post,denoise};
    })()`);
    assert.ok(Math.abs(result.base-.3/Math.sqrt(2))<.0001,'Bypass preserves source');
    assert.ok(Math.abs(result.pre-result.post)>.005,`Effect order changes real audio: ${JSON.stringify(result)}`);
    assert.ok(result.denoise>0&&Number.isFinite(result.denoise));console.log('Chromium audio graph:',result);
    const wave=Buffer.alloc(44+48000*2);wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(48000,24);wave.writeUInt32LE(96000,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(96000,40);
    for(let i=0;i<48000;i++)wave.writeInt16LE(Math.round(6553*Math.sin(2*Math.PI*1000*i/48000)),44+i*2);
    fs.writeFileSync(path.join(root,'dist/audio-tone.wav'),wave);
    const volume=await player.webContents.executeJavaScript(`(async()=>{const audio=new Audio('audio-tone.wav');audio.loop=true;document.body.append(audio);const c=new AudioContext(),g=createGraph(c,c.createMediaElementSource(audio),model);g.apply({...model.defaults(),normalize:true},true);await c.resume();await audio.play();await new Promise(r=>setTimeout(r,300));const full=g.meter(1);audio.volume=.25;await new Promise(r=>setTimeout(r,300));const quiet=g.meter(.25);audio.pause();await c.close();return{full,quiet};})()`);
    assert.ok(volume.full.peak>.15,`Analyzer reads media samples: ${JSON.stringify(volume)}`);
    assert.ok(Math.abs(volume.quiet.peak/volume.full.peak-.25)<.01,'Media volume is applied before the analyzer');console.log('Media volume/analyzer:',volume);
    fs.writeFileSync(path.join(profile,'audio.json'),'{}');
    manager=createAudioManager({win:player,BrowserWindow,ipcMain,profileDir:profile,platform:process.platform});manager.open();
    const panel=BrowserWindow.getAllWindows().find(w=>w!==player);
    await new Promise(resolve=>panel.webContents.once('did-finish-load',resolve));await wait(500);
    const exec=code=>panel.webContents.executeJavaScript(code);
    assert.equal(await exec('document.querySelectorAll(".band input").length'),10);
    await exec(`document.getElementById('preset').value='rabbit-ears';document.getElementById('load-preset').click();
      document.getElementById('post').click();document.getElementById('linked').click();
      document.getElementById('makeup').value='4.2';document.getElementById('makeup').dispatchEvent(new Event('input'));
      document.getElementById('denoise').value='45';document.getElementById('denoise').dispatchEvent(new Event('input'));document.getElementById('cleanup').click();
      document.getElementById('preset-name').value='Saturday Morning Check';document.getElementById('save-preset').click();`);
    await wait(600);
    const saved=JSON.parse(fs.readFileSync(path.join(profile,'audio.json'),'utf8'));
    assert.equal(saved.current.position,'post');assert.equal(saved.current.makeup,4.2);assert.equal(saved.current.denoise,45);
    assert.equal(saved.cleanup,true);
    assert.equal(saved.presets.find(p=>p.name==='Saturday Morning Check').settings.makeup,4.2);
    fs.writeFileSync(path.join(root,'dist/audio-panel.png'),(await panel.webContents.capturePage()).toPNG());
    await exec(`document.getElementById('preset-name').value='Disposable Check';document.getElementById('save-preset').click();`);await wait(200);
    await exec(`document.getElementById('amount').value='62';document.getElementById('amount').dispatchEvent(new Event('input'));document.getElementById('update-preset').click();`);await wait(200);
    assert.equal(JSON.parse(fs.readFileSync(path.join(profile,'audio.json'),'utf8')).presets.find(p=>p.name==='Disposable Check').settings.amount,62);
    await exec(`document.getElementById('delete-preset').click();`);await wait(200);
    assert.ok(!JSON.parse(fs.readFileSync(path.join(profile,'audio.json'),'utf8')).presets.some(p=>p.name==='Disposable Check'));
    // Close immediately after the final input: the native close must flush it.
    await exec(`document.getElementById('denoise').value='47';document.getElementById('denoise').dispatchEvent(new Event('input'));`);panel.close();await wait(700);
    assert.ok(panel.isDestroyed(),'Native close completes after saving');
    assert.equal(JSON.parse(fs.readFileSync(path.join(profile,'audio.json'),'utf8')).current.denoise,47);
    manager.destroy();manager=createAudioManager({win:player,BrowserWindow,ipcMain,profileDir:profile,platform:process.platform});
    assert.equal(manager.snapshot().config.current.denoise,47,'Settings survive manager restart');
    console.log('Audio panel: ten EQ bands; Pre EQ/Post EQ; independent makeup; denoiser; custom preset; close/reopen persistence passed.');
    manager.destroy();player.destroy();app.exit(0);
  } catch(error) {console.error(error);app.exit(1);}
});
