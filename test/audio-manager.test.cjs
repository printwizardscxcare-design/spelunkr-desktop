'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const {EventEmitter}=require('node:events');
const path=require('node:path');const {pathToFileURL}=require('node:url');const {createAudioManager}=require('../src/audio-manager.cjs');
function setup(saved) {
  const file=path.join('/profile','audio.json'),files=new Map(saved?[[file,JSON.stringify(saved)]]:[]),handlers=new Map(),cleanup=[];let panel,fail=false;
  class Contents extends EventEmitter {constructor(url){super();this.mainFrame={url};this.messages=[];this.session={setPermissionRequestHandler(){}};}getURL(){return this.mainFrame.url;}send(...v){this.messages.push(v);}setIgnoreMenuShortcuts(){}setWindowOpenHandler(){}}
  const parent=Object.assign(new EventEmitter(),{webContents:new Contents('https://spelunkr.tv/'),isDestroyed:()=>false});
  class Panel extends EventEmitter {constructor(){super();panel=this;this.webContents=new Contents('');this.dead=false;}isDestroyed(){return this.dead;}focus(){}setMenu(){}async loadFile(file){this.webContents.mainFrame.url=pathToFileURL(file).href;}close(){this.dead=true;this.emit('closed');}}
  const ipc=Object.assign(new EventEmitter(),{handle:(name,fn)=>handlers.set(name,fn),removeHandler:name=>handlers.delete(name)});
  const io={readFileSync:file=>{if(!files.has(file))throw Error('Missing');return files.get(file);},writeFileSync(file,text){if(fail)throw Error('Denied');files.set(file,text);},renameSync(a,b){files.set(b,files.get(a));files.delete(a);}};
  const manager=createAudioManager({win:parent,BrowserWindow:Panel,ipcMain:ipc,profileDir:'/profile',platform:'win32',io,onCleanup:value=>cleanup.push(value)});
  const event=contents=>({sender:contents,senderFrame:contents.mainFrame});
  return {manager,handlers,parent,cleanup,files,file,event,ipc,fail:()=>{fail=true;},get panel(){return panel;},save:value=>handlers.get('audio:save')(event(panel.webContents),value)};
}
test('audio and custom presets persist atomically; subtitle cleanup remains independent',()=>{
  const h=setup();h.manager.open();const next=structuredClone(h.manager.snapshot().config);
  next.current={...next.current,denoise:45,compression:true,linked:false,makeup:4.2,position:'post'};next.cleanup=true;next.presets=[{name:'Saturday Morning',settings:next.current}];
  assert.equal(h.save(next).ok,true);assert.deepEqual(h.cleanup,[false,true]);
  const stored=JSON.parse(h.files.get(h.file)),reopened=setup(stored);
  assert.equal(reopened.manager.snapshot().config.current.position,'post');assert.equal(reopened.manager.snapshot().config.current.denoise,45);
  assert.equal(reopened.manager.snapshot().config.presets[0].settings.makeup,4.2);assert.deepEqual(reopened.cleanup,[true]);
  h.fail();assert.equal(h.save({...next,cleanup:false}).ok,false);assert.equal(h.manager.snapshot().config.cleanup,true);
  h.manager.destroy();reopened.manager.destroy();
});
test('web pages, other windows, and subframes cannot read or write the Audio memory bank',()=>{
  const h=setup(),web=h.event(h.parent.webContents);h.manager.open();
  assert.throws(()=>h.handlers.get('audio:load')(web),/only available/);
  assert.equal(h.handlers.get('audio:save')(web,{current:{normalize:true}}).ok,false);
  const subframe={...h.event(h.panel.webContents),senderFrame:{url:h.panel.webContents.mainFrame.url}};
  assert.equal(h.handlers.get('audio:save')(subframe,{}).ok,false);assert.equal(h.files.size,0);
  h.manager.destroy();assert.equal(h.handlers.size,0);
});
