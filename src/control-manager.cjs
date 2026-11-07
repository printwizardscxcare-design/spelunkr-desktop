'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const model = require('./controls-model.js');
const {isSite} = require('./policy.cjs');

function createControlManager({win, BrowserWindow, ipcMain, profileDir, platform, actions, onPlayback = () => {}, io = fs}) {
  const file = path.join(profileDir, 'controls.json');
  const settingsFile = path.join(__dirname, 'controls.html');
  const settingsUrl = pathToFileURL(settingsFile).href;
  let current = model.defaults(platform), settingsWindow = null, catalog = [];
  try {current = model.config(JSON.parse(io.readFileSync(file, 'utf8')), platform);} catch {}
  const fromPlayer = event => event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame && isSite(event.senderFrame?.url);
  const fromSettings = event => settingsWindow && !settingsWindow.isDestroyed() && event.sender === settingsWindow.webContents &&
    event.senderFrame === settingsWindow.webContents.mainFrame && event.senderFrame?.url === settingsUrl;
  const push = () => {
    if (!win.isDestroyed() && isSite(win.webContents.getURL())) win.webContents.send('desktop:controls-state', {config: current, suspended: Boolean(settingsWindow)});
  };
  const snapshot = () => {
    const pages = model.mergePages(current.pageActions, catalog);
    const expanded = model.config(current, platform, pages);
    return {platform, config: expanded, actions: model.actions(platform, pages)};
  };
  function open() {
    if (settingsWindow && !settingsWindow.isDestroyed()) {settingsWindow.focus();return;}
    settingsWindow = new BrowserWindow({width: 1000, height: 780, minWidth: 760, minHeight: 540,
      title: 'Controls — Spelunkr Desktop', backgroundColor: '#1c0a57', show: true,
      webPreferences: {preload: path.join(__dirname, 'controls-preload.cjs'), partition: 'controls-settings',
        nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true}});
    if (platform !== 'darwin') settingsWindow.setMenu(null);
    settingsWindow.webContents.setIgnoreMenuShortcuts(true);
    settingsWindow.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
    settingsWindow.webContents.on('will-navigate', event => event.preventDefault());
    settingsWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    settingsWindow.on('closed', () => {settingsWindow = null;push();if (!win.isDestroyed()) win.focus();});
    push();
    win.webContents.send('desktop:controls-query');
    settingsWindow.loadFile(settingsFile).catch(error => {
      console.error('Controls settings failed to load:', error.message);
      if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close();
    });
  }
  const ready = event => {if (fromPlayer(event)) push();};
  const receivedCatalog = (event, values) => {
    if (!fromPlayer(event) || !Array.isArray(values)) return;
    catalog = model.mergePages(values.slice(0,128));
    if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.webContents.send('controls:catalog', snapshot());
  };
  const perform = (event, id) => {
    if (!fromPlayer(event) || settingsWindow || win.isFocused && !win.isFocused() || typeof id !== 'string' || !model.actions(platform).some(a => a.id === id && a.native) ||
      !Object.hasOwn(actions, id) || typeof actions[id] !== 'function') return;
    actions[id]();
  };
  const load = event => {
    if (!fromSettings(event)) throw Error('Controls settings are only available in the settings window.');
    return snapshot();
  };
  const save = (event, value) => {
    if (!fromSettings(event)) return {ok: false, error: 'This settings window is no longer available.'};
    try {
      if (JSON.stringify(value).length > 128 * 1024) throw Error('There are too many control assignments.');
      const next = model.config(value, platform, model.mergePages(current.pageActions, catalog));
      next.pageActions = next.pageActions.filter(action => next.bindings[action.id]?.keyboard || next.bindings[action.id]?.gamepad);
      const allowed = new Set([...model.ACTIONS.map(a => a.id), ...next.pageActions.map(a => a.id)]);
      for (const id of Object.keys(next.bindings)) if (!allowed.has(id)) delete next.bindings[id];
      io.writeFileSync(file + '.tmp', JSON.stringify(next, null, 2));
      io.renameSync(file + '.tmp', file);
      current = next;
      push();
      return {ok: true};
    } catch (error) {return {ok: false, error: error.code ? 'Your controls could not be saved. Try again.' : error.message};}
  };
  const close = event => {if (fromSettings(event)) settingsWindow.close();};
  const playback = (event, state) => {if (fromPlayer(event) && ['pause', 'playing', 'reset'].includes(state)) onPlayback(state);};
  ipcMain.on('controls:ready', ready);
  ipcMain.on('controls:catalog', receivedCatalog);
  ipcMain.on('controls:action', perform);
  ipcMain.on('controls:close', close);
  ipcMain.on('controls:playback', playback);
  ipcMain.handle('controls:load', load);
  ipcMain.handle('controls:save', save);
  win.webContents.on('did-finish-load', push);
  const destroy = () => {
    ipcMain.removeListener('controls:ready', ready);ipcMain.removeListener('controls:catalog', receivedCatalog);
    ipcMain.removeListener('controls:action', perform);ipcMain.removeListener('controls:close', close);
    ipcMain.removeListener('controls:playback', playback);
    ipcMain.removeHandler('controls:load');ipcMain.removeHandler('controls:save');
    win.webContents.removeListener('did-finish-load', push);
    if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close();
  };
  win.once('closed', destroy);
  return {open, push, snapshot, destroy};
}
module.exports = {createControlManager};
