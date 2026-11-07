'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {toggleVideoFullscreen} = require('../src/video-fullscreen.cjs');
const source = `(${toggleVideoFullscreen.toString()})()`;
test('fullscreen uses the same video button and exits the same HTML fullscreen mode', async () => {
  let clicked = 0, exited = 0, fallback = 0;
  const button = {click: () => clicked++};
  const context = {location: {origin: 'https://spelunkr.tv'},document: {fullscreenElement: null,
    querySelector: selector => selector === '.player-fullscreen-btn' ? button : {requestFullscreen: () => fallback++},
    exitFullscreen: async () => {exited++;}}};
  vm.runInNewContext(source,context);assert.equal(clicked,1);assert.equal(fallback,0);
  context.document.fullscreenElement = {};await vm.runInNewContext(source,context);assert.equal(exited,1);assert.equal(clicked,1);
  context.document.fullscreenElement = null;button.disabled = true;vm.runInNewContext(source,context);assert.equal(fallback,1);
  context.location.origin = 'https://example.com';vm.runInNewContext(source,context);assert.equal(fallback,1);
});
