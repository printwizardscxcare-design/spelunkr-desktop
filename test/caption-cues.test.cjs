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

test('Whisper batching does not clear subtitles while speech is still active', () => {
  const h=harness();
  h.cues.setSpeechActive(true);h.cues.update('Speech continues.');
  h.advance(6000);assert.equal(h.cues.text,'Speech continues.');
  h.cues.setSpeechActive(false);h.advance(1499);assert.equal(h.cues.text,'Speech continues.');
  h.advance(1);assert.equal(h.cues.text,'');
});

test('new speech cancels a pending pause clear while the next batch is recognized', () => {
  const h=harness();h.cues.update('First caption.');h.advance(1000);
  h.cues.setSpeechActive(true);h.advance(4000);assert.equal(h.cues.text,'First caption.');
  h.cues.update('First caption. Next words.');
  h.cues.setSpeechActive(false);h.advance(1500);assert.equal(h.cues.text,'');
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
test('cue metadata tracks rolling word offsets and distinguishes a pause from a reset', () => {
  let time = 0;
  let timeout;
  const output = [];
  const cues = new CaptionCues({ now: () => time, onText: (text, metadata) => output.push({ text, ...metadata }),
    schedule: fn => { timeout = fn; return 1; }, cancel() {} });
  cues.update('A twenty-one year old story continues');
  const id = output.at(-1).cueId;
  cues.update('year old story continues today');
  assert.equal(output.at(-1).cueId, id);
  assert.equal(output.at(-1).wordOffset, 2);
  time = 10000;
  timeout();
  assert.equal(output.at(-1).clearReason, 'pause');
  cues.clear();
  assert.equal(output.at(-1).clearReason, 'reset');
  cues.update('year old story continues today with more words');
  assert.ok(output.at(-1).cueId > id);
  assert.equal(output.at(-1).text, 'with more words');
});
test('enabling captions on an existing Windows transcript starts with new speech', () => {
  const output = [];
  const cues = new CaptionCues({ ignoreInitialSnapshot: true, onText: text => output.push(text),
    schedule: () => 1, cancel() {} });
  cues.update('Earlier words from the Windows caption window.');
  assert.equal(cues.text, '');
  cues.update('Earlier words from the Windows caption window. Current dialogue starts here.');
  assert.equal(cues.text, 'Current dialogue starts here.');
  cues.clear({ keepSnapshot: false });
});
