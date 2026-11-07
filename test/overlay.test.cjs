'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../src/preload.cjs'), 'utf8');

function setup() {
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
    window: { addEventListener() {} }, innerHeight: 1080, innerWidth: 1920, setInterval() {}, setTimeout() {}, clearTimeout() {}
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
