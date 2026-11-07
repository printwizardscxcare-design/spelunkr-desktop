'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CaptionPages } = require('../src/caption-pages.cjs');

function harness() {
  let time = 0;
  const pages = new CaptionPages({ now: () => time });
  return { pages, advance: ms => { time += ms; },
    feed: (text, cueId = 1, wordOffset = 0) => pages.receive({ enabled: true, text, cueId, wordOffset }),
    render: (width = 10) => pages.render(width, text => text.length).text };
}

test('filling two lines replaces the entire card instead of scrolling its first words away', () => {
  const h = harness();
  h.feed('one two three four');
  assert.equal(h.render(), 'one two\nthree four');
  h.advance(1000);
  h.feed('one two three four five');
  assert.equal(h.render(), 'five');
  h.feed('one two three four five six');
  assert.equal(h.render(), 'five six');
});
test('a recognition burst is paged from its beginning with no skipped or repeated words', () => {
  const h = harness();
  const text = 'one two three four five six seven eight nine ten';
  h.feed(text);
  h.pages.receive({ enabled: true, text: '', cueId: 1, clearReason: 'pause' });
  const cards = [h.render()];
  for (let index = 0; index < 5; index++) { h.advance(4000); cards.push(h.render()); }
  assert.equal(cards.filter(Boolean).join(' ').replace(/\s+/g, ' '), text);
  assert.ok(cards.every(card => card.split('\n').length <= 2));
  assert.equal(cards.at(-1), '');
});
test('a new card does not flash past before its minimum reading time', () => {
  const h = harness();
  h.feed('one two three');
  const first = h.render();
  h.advance(100);
  h.feed('one two three four five');
  assert.equal(h.render(), 'one two\nthree four');
  h.advance(799);
  assert.equal(h.render(), 'one two\nthree four');
  h.advance(1);
  assert.equal(h.render(), 'five');
  assert.ok(first.startsWith('one two'));
});
test('Windows dropping transcript history does not move the current card backwards', () => {
  const h = harness();
  h.feed('one two three four five six');
  assert.equal(h.render(), 'one two\nthree four');
  h.advance(1000);
  assert.equal(h.render(), 'five six');
  h.feed('three four five six seven', 1, 2);
  assert.equal(h.render(), 'five six\nseven');
  h.feed('one TOO three four five six seven', 1, 0);
  assert.equal(h.render(), 'five six\nseven');
});
test('resize or larger text reflows the unconsumed words instead of dropping them', () => {
  const h = harness();
  const text = 'one two three four five six';
  h.feed(text);
  assert.equal(h.render(10), 'one two\nthree four');
  assert.equal(h.render(6), 'one\ntwo');
  h.pages.receive({ enabled: true, text: '', cueId: 1, clearReason: 'pause' });
  const cards = [h.render(6)];
  for (let index = 0; index < 4; index++) { h.advance(4000); cards.push(h.render(6)); }
  assert.equal(cards.filter(Boolean).join(' ').replace(/\s+/g, ' '), text);
});
test('a following phrase queues behind unread cards and old style updates cannot resurrect a finished cue', () => {
  const h = harness();
  h.feed('one two three four five six', 1);
  assert.equal(h.render(), 'one two\nthree four');
  h.feed('new phrase', 2);
  h.advance(1000);
  assert.equal(h.render(), 'five six');
  h.advance(1000);
  assert.equal(h.render(), 'new phrase');
  h.pages.receive({ enabled: true, text: '', cueId: 2, clearReason: 'pause' });
  h.advance(1500);
  assert.equal(h.render(), '');
  h.feed('new phrase', 2);
  assert.equal(h.render(), '');
});
test('turning captions off or changing channel clears pending cards immediately', () => {
  const h = harness();
  h.feed('one two three four five six');
  assert.ok(h.render());
  h.pages.receive({ enabled: false, text: '' });
  assert.equal(h.render(), '');
  h.feed('another long phrase with pending words', 2);
  assert.ok(h.render());
  h.pages.receive({ enabled: true, text: '', clearReason: 'reset', cueId: 2 });
  assert.equal(h.render(), '');
});
test('an unusually long word is fitted intact', () => {
  const h = harness();
  h.feed('antidisestablishmentarianism');
  const result = h.pages.render(10, text => text.length);
  assert.equal(result.text, 'antidisestablishmentarianism');
  assert.ok(result.scale > 0 && result.scale < 1);
});
