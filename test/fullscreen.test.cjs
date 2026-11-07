'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../src/preload.cjs'), 'utf8');

function harness({ origin = 'https://spelunkr.tv', mainFrame = true, htmlFullscreen = false, dialog = false } = {}) {
  const listeners = new Map();
  const sent = [];
  let fullscreenListener;
  const context = {
    require: () => ({ ipcRenderer: { on: (_name, fn) => { fullscreenListener = fn; } } }),
    location: { origin }, process: { isMainFrame: mainFrame },
    document: { fullscreenElement: htmlFullscreen ? {} : null, querySelectorAll: () => dialog ? [{ getClientRects: () => [1] }] : [] },
    window: { addEventListener: (name, fn) => listeners.set(name, fn), dispatchEvent: e => sent.push(e) },
    KeyboardEvent: class { constructor(type, args) { this.type = type; Object.assign(this, args); } }
  };
  vm.runInNewContext(source, context);
  return { sent, listeners, setFullscreen: value => fullscreenListener?.({}, value), key(key, overrides = {}) {
    const event = { key, target: { closest: () => null }, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...overrides };
    listeners.get('keydown')?.(event);
    return event;
  } };
}

test('arrows change channels in F11 fullscreen and suppress volume/scroll handlers', () => {
  const h = harness();
  h.key('ArrowUp');
  assert.equal(h.sent.length, 0);
  h.setFullscreen(true);
  const up = h.key('ArrowUp');
  const down = h.key('ArrowDown');
  assert.deepEqual(h.sent.map(e => e.key), ['ChannelUp', 'ChannelDown']);
  assert.ok(up.prevented && up.stopped && down.prevented && down.stopped);
  h.setFullscreen(false);
  h.key('ArrowUp');
  assert.equal(h.sent.length, 2);
});
test('the website video fullscreen also supports channel changes', () => {
  const h = harness({ htmlFullscreen: true });
  h.key('ArrowUp');
  assert.equal(h.sent[0].key, 'ChannelUp');
});
test('typing, sliders, modifiers, dialogs and held keys do not accidentally change channels', () => {
  const h = harness({ htmlFullscreen: true });
  for (const override of [ { target: { isContentEditable: true } }, { target: { closest: () => ({}) } }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { metaKey: true }, { repeat: true } ]) h.key('ArrowUp', override);
  assert.equal(h.sent.length, 0);
  const modal = harness({ htmlFullscreen: true, dialog: true });
  modal.key('ArrowDown');
  assert.equal(modal.sent.length, 0);
});
test('adapter never installs on authentication pages or subframes', () => {
  for (const options of [{ origin: 'https://discord.com' }, { mainFrame: false }]) assert.equal(harness(options).listeners.size, 0);
});
