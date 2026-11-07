'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {CaptionTiming} = require('../src/caption-timing.cjs');
const {CaptionPages} = require('../src/caption-pages.cjs');

function harness() {
  let time = 0, id = 0;
  const timers = new Map(), output = [];
  const pages = new CaptionPages({now: () => time});
  const timing = new CaptionTiming({now: () => time,
    schedule: (callback, wait) => {timers.set(++id, {callback, at: time + wait});return id;},
    cancel: key => timers.delete(key),
    onCue: (text, metadata) => {output.push({at: time, text, ...metadata});pages.receive({enabled: true, text, ...metadata});}
  });
  return {timing, pages, output,
    receive: (text, cueId = 1, reason = '') => timing.receive(text, {cueId, wordOffset: 0, clearReason: reason}),
    advance(ms) {
      const end = time + ms;
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
        if (!next) break;
        time = next[1].at;timers.delete(next[0]);next[1].callback();
      }
      time = end;
    },
    render: () => pages.render(20, text => text.length).text
  };
}

test('zero added delay delivers text immediately', () => {
  const h = harness();h.receive('Hello there');
  assert.deepEqual(h.output.map(({at,text}) => ({at,text})), [{at: 0, text: 'Hello there'}]);
});

test('text, revisions, and silence clearing retain their relative timing', () => {
  const h = harness();h.timing.setDelay(2000);
  h.receive('Hello');h.advance(500);h.receive('Hello there');h.advance(1500);
  assert.equal(h.render(), 'Hello');
  h.receive('',1,'pause');h.advance(500);
  assert.equal(h.render(), 'Hello there');
  h.advance(1499);assert.ok(h.render());h.advance(1);assert.equal(h.render(), '');
  assert.deepEqual(h.output.map(({at}) => at), [2000,2500,4000]);
});

test('changing delay reschedules from arrival time and never duplicates a cue', () => {
  const h = harness();h.timing.setDelay(2000);h.receive('one');h.advance(500);
  h.timing.setDelay(1000);h.advance(499);assert.equal(h.output.length,0);
  h.advance(1);assert.equal(h.output.length,1);h.advance(5000);assert.equal(h.output.length,1);
  h.timing.setDelay(5000);h.receive('two',2);h.advance(500);h.timing.setDelay(0);
  assert.equal(h.output.at(-1).text,'two');assert.equal(h.output.length,2);
});

test('off, channel changes, and seeks cancel delayed text and delayed clears immediately', () => {
  const h = harness();h.timing.setDelay(3000);h.receive('old text');h.advance(100);
  h.receive('',1,'reset');assert.equal(h.output.length,1);assert.equal(h.render(),'');
  h.receive('new channel',2);h.advance(2900);assert.equal(h.render(),'');
  h.advance(100);assert.equal(h.render(),'new channel');
  h.receive('',2,'pause');h.receive('',2,'reset');h.advance(10000);
  assert.equal(h.render(),'');assert.equal(h.output.filter(item => item.text === 'old text').length,0);
});

test('delay values are bounded and cannot create invalid timers', () => {
  const h = harness();
  for (const value of [-1, 10001, NaN, Infinity, '1000', .5]) assert.throws(() => h.timing.setDelay(value));
  h.timing.setDelay(10000);h.receive('ten seconds');h.advance(9999);assert.equal(h.output.length,0);
  h.advance(1);assert.equal(h.output.length,1);h.timing.reset();
});
