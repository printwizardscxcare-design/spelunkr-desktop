'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../src/preload.cjs'), 'utf8');

function setup({ width = 1920, height = 1080 } = {}) {
  const ipc = new Map();
  const events = new Map();
  const elements = [];
  class Element {
    constructor(tag) { this.tag = tag; this.style = {}; this.children = []; elements.push(this); }
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    attachShadow() { this.shadow = new Element('shadow'); return this.shadow; }
  }
  const root = new Element('html');
  const stage = new Element('div');
  stage.getBoundingClientRect = () => ({ left: 100, top: 100, bottom: 700, width: 1000, height: 600 });
  const video = { getBoundingClientRect: stage.getBoundingClientRect };
  const document = { documentElement: root, fullscreenElement: null, addEventListener: (name, fn) => events.set(name, fn), querySelector: () => video, querySelectorAll: () => [], createElement: tag => new Element(tag) };
  vm.runInNewContext(source, {
    require: () => ({ ipcRenderer: { on: (name, fn) => ipc.set(name, fn) } }),
    location: { origin: 'https://spelunkr.tv' }, process: { isMainFrame: true }, document,
    window: { addEventListener() {} }, innerHeight: height, innerWidth: width, setInterval() {}, setTimeout() {}, clearTimeout() {}
  });
  return { document, root, stage, elements, events, send: value => ipc.get('desktop:captions')({}, value) };
}

test('overlay uses transparent background and white or yellow text without rendering HTML', () => {
  const h = setup();
  h.send({ enabled: true, color: 'white', text: '<b>These are subtitles</b>' });
  const overlay = h.elements.find(e => e.id === 'spelunkr-desktop-caption-overlay');
  const line = h.elements.find(e => e.tag === 'span');
  assert.match(overlay.style.cssText, /background:transparent!important/);
  assert.match(overlay.style.cssText, /pointer-events:none/);
  assert.equal(line.style.color, '#ffffff');
  assert.equal(line.textContent, '<b>These are subtitles</b>');
  assert.equal(overlay.style.display, 'flex');
  assert.equal(overlay.style.bottom, '416px');
  h.send({ enabled: true, color: 'yellow', text: 'Yellow captions' });
  assert.equal(line.style.color, '#ffeb3b');
  h.send({ enabled: false, color: 'yellow', text: '' });
  assert.equal(overlay.style.display, 'none');
});
test('fullscreen text uses screen width and scales with a larger display', () => {
  for (const [width, height, expectedFont] of [[1920, 1080, '43.2px'], [3840, 2160, '80px']]) {
    const h = setup({ width, height });
    h.document.fullscreenElement = h.stage;
    h.send({ enabled: true, color: 'white', text: 'Readable fullscreen captions' });
    const line = h.elements.find(e => e.tag === 'span');
    assert.equal(line.style.maxWidth, '90%');
    assert.equal(line.style.fontSize, expectedFont);
  }
});
test('viewer-selected size changes text size and reflows without losing transparency', () => {
  const h = setup();
  const incoming = { enabled: true, color: 'yellow', text: 'Adjustable subtitle size' };
  h.send({ ...incoming, size: 1 });
  const line = h.elements.find(e => e.tag === 'span');
  assert.equal(line.style.fontSize, '26px');
  h.send({ ...incoming, size: 1.5 });
  assert.equal(line.style.fontSize, '39px');
  assert.equal(line.style.color, '#ffeb3b');
  h.send({ ...incoming, size: 99 });
  assert.equal(line.style.fontSize, '26px');
  h.send({ ...incoming, size: 0.8 });
  assert.equal(line.style.fontSize, '20.8px');
});
test('long rolling transcripts stay short enough for a subtitle overlay', () => {
  const h = setup();
  h.send({ enabled: true, color: 'white', text: 'This sentence repeats. '.repeat(40) });
  const line = h.elements.find(e => e.tag === 'span');
  assert.ok(line.textContent.length <= 120);
  assert.equal(line.style.fontSize, '26px');
});
test('caption overlay follows the video into HTML fullscreen', () => {
  const h = setup();
  h.send({ enabled: true, color: 'white', text: 'Stay inside fullscreen' });
  const overlay = h.elements.find(e => e.id === 'spelunkr-desktop-caption-overlay');
  assert.equal(overlay.parentNode, h.root);
  h.document.fullscreenElement = h.stage;
  h.events.get('fullscreenchange')();
  assert.equal(overlay.parentNode, h.stage);
  assert.equal(overlay.style.width, '100%');
  assert.equal(overlay.style.bottom, '8%');
});
