'use strict';
const {contextBridge,ipcRenderer}=require('electron');
if (location.protocol==='file:' && location.pathname.endsWith('/audio.html')) {
  contextBridge.exposeInMainWorld('audioSettings',{
    load:()=>ipcRenderer.invoke('audio:load'),save:value=>ipcRenderer.invoke('audio:save',value),close:()=>ipcRenderer.send('audio:close'),
    onStatus:callback=>ipcRenderer.on('audio:status',(_event,value)=>callback(value))
  });
}
