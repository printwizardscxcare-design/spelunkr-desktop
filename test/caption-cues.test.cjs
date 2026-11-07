'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CaptionCues } = require('../src/caption-cues.cjs');

function harness() {
  let time = 0;
  let nextId = 0;
  const tasks = new Map();
  const emitted = [];
  const cues = new CaptionCues({
    now: () => time, onText: text => emitted.push(text),
    schedule: (fn, delay) => { const id = ++nextId; tasks.set(id, { fn, at: time + delay }); return id; },
    cancel: id => tasks.delete(id)
  });
  return { cues, emitted, advance(ms) {
    const end = time + ms;
    for (;;) {
      const due = [...tasks.entries()].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      time = due[1].at;
      tasks.delete(due[0]);
      due[1].fn();
    }
    time = end;
  } };
}

test('a short caption clears after a 1.5-second pause and stays blank', () => {
  const h = harness();
  h.cues.update('Hello there.');
  h.advance(1499);
  assert.equal(h.cues.text, 'Hello there.');
  h.advance(1);
  assert.equal(h.cues.text, '');
  h.advance(20000);
  assert.equal(h.cues.text, '');
});
test('case and punctuation corrections do not extend the pause timer or resurrect captions', () => {
  const h = harness();
  h.cues.update('Hello there');
  h.advance(1000);
  h.cues.update('HELLO there!');
  h.advance(500);
  assert.equal(h.cues.text, '');
  h.cues.update('Hello there.');
  h.advance(5000);
  assert.equal(h.cues.text, '');
});
test('after silence only the new phrase is shown, even when Windows retains earlier words', () => {
  const h = harness();
  h.cues.update('Hello there.');
  h.advance(1500);
  h.cues.update('Hello there. A new sentence.');
  assert.equal(h.cues.text, 'A new sentence.');
  h.advance(1000);
  h.cues.update('Hello there. A new sentence continues.');
  assert.equal(h.cues.text, 'A new sentence continues.');
  h.advance(1500);
  assert.equal(h.cues.text, '');
});
test('new words keep an active caption visible through short pauses', () => {
  const h = harness();
  h.cues.update('We');
  h.advance(1000);
  h.cues.update('We are');
  h.advance(1000);
  h.cues.update('We are still talking.');
  h.advance(1499);
  assert.equal(h.cues.text, 'We are still talking.');
  h.advance(1);
  assert.equal(h.cues.text, '');
});
test('a batch of text gets reading time instead of flashing away', () => {
  const h = harness();
  h.cues.update('A longer subtitle that arrives all at once needs enough time for the viewer to read it comfortably.');
  h.advance(1500);
  assert.notEqual(h.cues.text, '');
  h.advance(2499);
  assert.notEqual(h.cues.text, '');
  h.advance(1);
  assert.equal(h.cues.text, '');
});
test('rolling transcript windows retain the new-phrase boundary', () => {
  const h = harness();
  h.cues.update('One two three four.');
  h.advance(1500);
  h.cues.update('One two three four. Five six.');
  assert.equal(h.cues.text, 'Five six.');
  h.cues.update('Three four. Five six seven.');
  assert.equal(h.cues.text, 'Five six seven.');
});
test('a correction to an old word after silence does not display the old phrase', () => {
  const h = harness();
  h.cues.update('They are here');
  h.advance(1500);
  h.cues.update('They were here');
  assert.equal(h.cues.text, '');
  h.cues.update('They were here yesterday');
  assert.equal(h.cues.text, 'yesterday');
});
test('clearing for a channel switch cancels pending timing and retains the consumed snapshot', () => {
  const h = harness();
  h.cues.update('Previous channel');
  h.cues.clear();
  h.cues.update('Previous channel.');
  assert.equal(h.cues.text, '');
  h.cues.update('A different channel starts.');
  assert.equal(h.cues.text, 'A different channel starts.');
  h.cues.clear({ keepSnapshot: false });
  h.advance(10000);
  assert.equal(h.cues.text, '');
});
