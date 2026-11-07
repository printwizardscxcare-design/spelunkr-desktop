'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const model = require('./audio-model.js');
const {isSite} = require('./policy.cjs');

function createAudioManager({win, BrowserWindow, ipcMain, profileDir, platform, io=fs, onCleanup=()=>{}}) {
  const player=win.webContents, file=path.join(profileDir,'audio.json'), html=path.join(__dirname,'audio.html');
  const settingsUrl=pathToFileURL(html).href;
  let current=model.config(), panel=null, status={text:'Original sound'};
  try {current=model.config(JSON.parse(io.readFileSync(file,'utf8')));} catch {}
  onCleanup(current.cleanup);
  const fromPlayer = event => event.sender===player && event.senderFrame===player.mainFrame && isSite(event.senderFrame?.url);
  const fromPanel = event => panel && !panel.isDestroyed() && event.sender===panel.webContents && event.senderFrame===panel.webContents.mainFrame && event.senderFrame?.url===settingsUrl;
  const push = () => {if (!win.isDestroyed() && isSite(player.getURL())) player.send('desktop:audio-state',current.current);};
  const snapshot = () => ({config:current,presets:model.PRESETS,status});
  function open() {
    if (panel && !panel.isDestroyed()) {panel.focus();return;}
    panel=new BrowserWindow({width:960,height:850,minWidth:750,minHeight:620,title:'Audio — Spelunkr Desktop',backgroundColor:'#1c0a57',
      webPreferences:{preload:path.join(__dirname,'audio-preload.cjs'),partition:'audio-settings',nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
    if (platform!=='darwin') panel.setMenu(null);
    panel.webContents.setIgnoreMenuShortcuts(true);
    panel.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    panel.webContents.on('will-navigate',event=>event.preventDefault());
    panel.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
    panel.on('closed',()=>{panel=null;});
    panel.loadFile(html).catch(()=>{if (panel && !panel.isDestroyed()) panel.close();});
  }
  const load = event => {if (!fromPanel(event)) throw Error('Audio settings are only available in the Audio window.');return snapshot();};
  const save = (event,value) => {
    if (!fromPanel(event)) return {ok:false,error:'This Audio window is no longer available.'};
    try {
      if (JSON.stringify(value).length>64*1024) throw Error('Too many audio presets.');
      const next=model.config(value);
      io.writeFileSync(file+'.tmp',JSON.stringify(next,null,2));io.renameSync(file+'.tmp',file);
      const changed=next.cleanup!==current.cleanup;
      current=next;if(changed)onCleanup(current.cleanup);push();return {ok:true,config:current};
    } catch {return {ok:false,error:'Your audio settings could not be saved. Try again.'};}
  };
  const ready = event => {if (fromPlayer(event)) push();};
  const receiveStatus = (event,value) => {
    if (!fromPlayer(event) || typeof value?.text!=='string') return;
    status={text:value.text.slice(0,180),gainDb:Number.isFinite(value.gainDb)?Math.max(-24,Math.min(12,value.gainDb)):0,
      reduction:Number.isFinite(value.reduction)?Math.max(-100,Math.min(0,value.reduction)):0};
    if (panel && !panel.isDestroyed()) panel.webContents.send('audio:status',status);
  };
  const close = event => {if (fromPanel(event)) panel.close();};
  ipcMain.on('audio:ready',ready);ipcMain.on('audio:status',receiveStatus);ipcMain.on('audio:close',close);
  ipcMain.handle('audio:load',load);ipcMain.handle('audio:save',save);player.on('did-finish-load',push);
  function destroy() {
    ipcMain.removeListener('audio:ready',ready);ipcMain.removeListener('audio:status',receiveStatus);ipcMain.removeListener('audio:close',close);
    ipcMain.removeHandler('audio:load');ipcMain.removeHandler('audio:save');player.removeListener('did-finish-load',push);
    if (panel && !panel.isDestroyed()) panel.close();
  }
  win.once('closed',destroy);
  return {open,push,snapshot,destroy};
}
module.exports={createAudioManager};
