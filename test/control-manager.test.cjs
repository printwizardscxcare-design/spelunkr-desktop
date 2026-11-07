'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {createControlManager}=require('../src/control-manager.cjs');
const model=require('../src/controls-model.js');

function setup(saved) {
  const files=new Map(saved?[[path.join('/profile','controls.json'),JSON.stringify(saved)]]:[]), handlers=new Map();
  let child, focused=true, writes=0, failWrite=false, invoked=0;
  const playback=[];
  class Contents extends EventEmitter {
    constructor(url){super();this.mainFrame={url};this.messages=[];this.session={setPermissionRequestHandler(){}};}
    getURL(){return this.mainFrame.url;}
    send(...args){this.messages.push(args);}
    setIgnoreMenuShortcuts(){} setWindowOpenHandler(){}
  }
  const parent=Object.assign(new EventEmitter(),{webContents:new Contents('https://spelunkr.tv/'),isDestroyed:()=>false,isFocused:()=>focused,focus(){focused=true;}});
  class Settings extends EventEmitter {
    constructor(){super();child=this;this.webContents=new Contents('');this.destroyed=false;}
    setMenu(){}show(){}focus(){}isDestroyed(){return this.destroyed;}
    async loadFile(file){this.webContents.mainFrame.url=pathToFileURL(file).href;}
    close(){this.destroyed=true;this.emit('closed');}
  }
  const ipc=Object.assign(new EventEmitter(),{handle:(name,fn)=>handlers.set(name,fn),removeHandler:name=>handlers.delete(name)});
  const io={readFileSync:file=>{if(!files.has(file))throw Error('Missing');return files.get(file);},writeFileSync(file,text){if(failWrite)throw Object.assign(Error('Denied'),{code:'EACCES'});writes++;files.set(file,text);},renameSync(from,to){files.set(to,files.get(from));files.delete(from);}};
  const manager=createControlManager({win:parent,BrowserWindow:Settings,ipcMain:ipc,profileDir:'/profile',platform:'win32',io,actions:{captions:()=>{invoked++;}},onPlayback:state=>playback.push(state)});
  const source=contents=>({sender:contents,senderFrame:contents.mainFrame});
  return {manager,ipc,files,parent,source,handlers,playback,get child(){return child;},get writes(){return writes;},get invoked(){return invoked;},setFocused:value=>{focused=value;},failWrite:()=>{failWrite=true;},
    load:()=>handlers.get('controls:load')(source(child.webContents)),save:value=>handlers.get('controls:save')(source(child.webContents),value)};
}
test('Cancel discards a draft and Save atomically persists all assignments for the next launch',()=>{
  const h=setup();h.manager.open();const snapshot=h.load();
  const draft=model.assign(snapshot.config.bindings,'channelNext',model.normalizeBinding({type:'key',code:'KeyZ'}));
  h.ipc.emit('controls:close',h.source(h.child.webContents));
  assert.equal(h.writes,0);assert.equal(h.manager.snapshot().config.bindings.channelNext.keyboard.code,'ArrowUp');
  h.manager.open();assert.equal(h.save({version:1,bindings:draft.bindings}).ok,true);
  const stored=[...h.files.values()][0];assert.equal(JSON.parse(stored).bindings.channelNext.keyboard.code,'KeyZ');
  h.ipc.emit('controls:close',h.source(h.child.webContents));
  assert.equal(h.manager.snapshot().config.bindings.channelNext.keyboard.code,'KeyZ');
  const reopened=setup(JSON.parse(stored));assert.equal(reopened.manager.snapshot().config.bindings.channelNext.keyboard.code,'KeyZ');
  h.manager.destroy();reopened.manager.destroy();
});
test('failed saving preserves the previously active controls',()=>{
  const h=setup();h.manager.open();const snapshot=h.load();h.failWrite();
  const bindings=model.assign(snapshot.config.bindings,'channelNext',model.normalizeBinding({type:'key',code:'KeyZ'})).bindings;
  assert.equal(h.save({version:1,bindings}).ok,false);
  assert.equal(h.manager.snapshot().config.bindings.channelNext.keyboard.code,'ArrowUp');h.manager.destroy();
});
test('remote pages and subframes cannot save settings or invoke unsupported native commands',()=>{
  const h=setup(), event=h.source(h.parent.webContents);
  h.ipc.emit('controls:action',event,'captions');assert.equal(h.invoked,1);
  h.ipc.emit('controls:action',{...event,senderFrame:{url:'https://spelunkr.tv/'}},'captions');
  h.ipc.emit('controls:action',event,'constructor');assert.equal(h.invoked,1);
  h.setFocused(false);h.ipc.emit('controls:action',event,'captions');assert.equal(h.invoked,1);
  h.setFocused(true);h.manager.open();
  h.ipc.emit('controls:action',event,'captions');assert.equal(h.invoked,1,'Settings capture must suspend background actions');
  assert.throws(()=>h.handlers.get('controls:load')(event),/only available/);
  assert.equal(h.handlers.get('controls:save')(event,{version:1,bindings:model.defaults().bindings}).ok,false);
  assert.equal(h.writes,0);h.manager.destroy();
});
test('page buttons are added to settings and a saved assignment remains available after the page changes',()=>{
  const h=setup();h.manager.open();
  h.ipc.emit('controls:catalog',h.source(h.parent.webContents),[{label:'Page button',match:{tag:'BUTTON',id:'page-button',label:'Page button'}}]);
  const snapshot=h.load(), action=snapshot.actions.find(a=>a.id.startsWith('page:'));
  assert.ok(action);
  const bindings=model.assign(snapshot.config.bindings,action.id,model.normalizeBinding({type:'key',code:'F8'})).bindings;
  assert.equal(h.save({version:1,bindings}).ok,true);
  h.ipc.emit('controls:close',h.source(h.child.webContents));
  h.ipc.emit('controls:catalog',h.source(h.parent.webContents),[]);
  assert.ok(h.manager.snapshot().actions.some(a=>a.id===action.id));h.manager.destroy();
});

test('only the player main frame can report a supported playback timing change',()=>{
  const h=setup(), event=h.source(h.parent.webContents);
  for (const state of ['pause','playing','reset']) h.ipc.emit('controls:playback',event,state);
  h.ipc.emit('controls:playback',event,'arbitrary');
  h.ipc.emit('controls:playback',{...event,senderFrame:{url:'https://spelunkr.tv/'}},'pause');
  assert.deepEqual(h.playback,['pause','playing','reset']);h.manager.destroy();
  h.ipc.emit('controls:playback',event,'pause');assert.equal(h.playback.length,3);
});
