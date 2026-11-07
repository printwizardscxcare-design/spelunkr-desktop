'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../src/preload.cjs'), 'utf8');

function harness({ origin = 'https://spelunkr.tv', mainFrame = true, htmlFullscreen = false, dialog = false, rewindButton = null, video = null } = {}) {
  const listeners = new Map();
  const sent = [];
  const ipc = new Map();
  const context = {
    require: () => ({ ipcRenderer: { on: (name, fn) => ipc.set(name, fn) } }),
    location: { origin }, process: { isMainFrame: mainFrame },
    document: { fullscreenElement: htmlFullscreen ? {} : null,
      querySelector: selector => selector === '#stage-key-rw' ? rewindButton : video,
      querySelectorAll: () => dialog ? [{ getClientRects: () => [1] }] : [] },
    window: { addEventListener: (name, fn) => listeners.set(name, fn), dispatchEvent: e => sent.push(e) },
    KeyboardEvent: class { constructor(type, args) { this.type = type; Object.assign(this, args); } }
  };
  vm.runInNewContext(source, context);
  return { sent, listeners, ipc, rewind: () => ipc.get('desktop:caption-rewind')?.({}), key(key, overrides = {}) {
    const event = { key, target: { closest: () => null }, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...overrides };
    listeners.get('keydown')?.(event);
    return event;
  } };
}

test('arrows change channels in windowed mode and suppress volume/scroll handlers', () => {
  const h = harness();
  const up = h.key('ArrowUp');
  const down = h.key('ArrowDown');
  assert.deepEqual(h.sent.map(e => e.key), ['ChannelUp', 'ChannelDown']);
  assert.ok(up.prevented && up.stopped && down.prevented && down.stopped);
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
  for (const options of [{ origin: 'https://discord.com' }, { mainFrame: false }]) {
    const h = harness(options);
    assert.equal(h.listeners.size, 0);
    assert.equal(h.ipc.size, 0);
  }
});

test('enabling captions uses the site rewind control and does not seek twice', () => {
  let clicks = 0;
  const video = { currentTime: 90 };
  const h = harness({ video, rewindButton: { click() { clicks++; } } });
  assert.equal(clicks, 0);
  h.rewind();
  assert.equal(clicks, 1);
  assert.equal(video.currentTime, 90);
});

test('compact-player rewind moves back 15 seconds within the available video', () => {
  for (const [time, start, expected] of [[90, 0, 75], [8, 0, 0], [50, 43, 43]]) {
    const video = { currentTime: time, seekable: { length: 1, start: () => start } };
    const h = harness({ video });
    assert.equal(video.currentTime, time);
    h.rewind();
    assert.equal(video.currentTime, expected);
  }
  harness().rewind();
  const unknownTime = { currentTime: NaN };
  harness({ video: unknownTime }).rewind();
  assert.ok(Number.isNaN(unknownTime.currentTime));
});
