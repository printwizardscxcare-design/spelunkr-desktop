'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const {EventEmitter} = require('node:events');
const main = require.resolve('../src/main.cjs');
const realRequire = createRequire(main);
const flush = () => new Promise(resolve => setImmediate(resolve));

async function appHarness(platform) {
  let window, bridge, menu;
  const messages = [], radioWrites = [];
  const app = Object.assign(new EventEmitter(), {
    isPackaged: false, setName() {}, enableSandbox() {}, requestSingleInstanceLock: () => true,
    whenReady: () => Promise.resolve(), getPath: () => '/profile', setAppUserModelId() {}, quit() {}
  });
  class Window extends EventEmitter {
    constructor() {
      super(); window = this;
      const contents = this.webContents = new EventEmitter();
      contents.url = 'https://spelunkr.tv/';
      contents.getURL = () => contents.url;
      contents.send = (channel, value) => messages.push({channel, value});
      contents.setWindowOpenHandler = () => {};
      this.loadURL = async url => { contents.url = url; };
      this.isDestroyed = () => false;
    }
  }
  class Bridge extends EventEmitter {
    constructor() { super(); bridge = this; this.active = false; }
    configure(options) { this.options = options; }
    start() { this.active = true; this.emit('status', 'Listening'); }
    async stop() { this.active = false; }
  }
  function buildMenu(templates) {
    const items = templates.map(template => ({...template,
      submenu: Array.isArray(template.submenu) ? buildMenu(template.submenu) : undefined}));
    const radios = items.filter(item => item.type === 'radio');
    const checked = new Map(radios.map(item => [item, Boolean(item.checked)]));
    for (const item of radios) Object.defineProperty(item, 'checked', {
      get: () => checked.get(item),
      set: value => {
        radioWrites.push({id: item.id, value});
        for (const sibling of radios) checked.set(sibling, sibling === item);
      }
    });
    return {items, getMenuItemById(id) {
      for (const item of items) {
        if (item.id === id) return item;
        const found = item.submenu?.getMenuItemById(id);
        if (found) return found;
      }
    }};
  }
  const Menu = {buildFromTemplate: buildMenu, setApplicationMenu: value => {menu = value;}, getApplicationMenu: () => menu};
  const ipcMain = Object.assign(new EventEmitter(), {handle() {}, removeHandler() {}});
  const electron = {app, BrowserWindow: Window, Menu, ipcMain, dialog: {}, shell: {}, screen: {getAllDisplays: () => []},
    session: {fromPartition: () => ({setPermissionRequestHandler() {}, setPermissionCheckHandler() {}, on() {}})}};
  vm.runInNewContext(fs.readFileSync(main, 'utf8'), {
    __dirname: path.dirname(main), process: {platform, env: {}},
    require(name) {
      if (name === 'electron') return electron;
      if (name === 'node:fs') return {readFileSync() {throw Error('No saved preferences');}, writeFileSync() {}};
      if (name === './caption-bridge.cjs') return {CaptionBridge: Bridge};
      return realRequire(name);
    }
  });
  await flush();
  return {window, bridge, menu, radioWrites, rewindCount: () => messages.filter(m => m.channel === 'desktop:caption-rewind').length};
}

for (const platform of ['win32', 'darwin', 'linux']) test(`${platform}: captions start off, None stops them, and only an off-to-on transition rewinds`, async () => {
  const h = await appHarness(platform);
  const item = id => h.menu.getMenuItemById(id);
  assert.equal(h.bridge.active, false);
  assert.equal(item('caption-engine-none').checked, true);
  assert.equal(h.rewindCount(), 0);

  item('caption-engine-whisper').click(); await flush();
  assert.equal(h.bridge.active, true);
  assert.equal(item('caption-engine-whisper').checked, true);
  assert.equal(item('caption-engine-none').checked, false);
  assert.equal(h.rewindCount(), 1);

  item('caption-speed').submenu.items[1].click(); await flush();
  h.window.webContents.emit('did-navigate-in-page'); await flush();
  item('caption-engine-whisper').click(); await flush();
  assert.equal(h.rewindCount(), 1, 'Speed, channel, and engine restarts must not rewind again');

  item('caption-engine-none').click(); await flush();
  assert.equal(h.bridge.active, false);
  assert.equal(item('caption-overlay').checked, false);
  assert.equal(item('caption-engine-none').checked, true);
  assert.equal(item('caption-speed').enabled, false);

  item('caption-overlay').click({checked: true}); await flush();
  assert.equal(h.bridge.active, true);
  assert.equal(item('caption-engine-whisper').checked, true);
  assert.equal(h.rewindCount(), 2);
  assert.ok(h.radioWrites.every(write => write.value === true), 'Radio selection must not assign false to sibling items');
  h.window.emit('closed'); await flush();
});
