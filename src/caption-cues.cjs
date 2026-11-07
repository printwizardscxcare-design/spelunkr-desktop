'use strict';

function snapshot(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const words = [...text.matchAll(/\S+/gu)].filter(match => /[\p{L}\p{N}]/u.test(match[0]))
    .map(match => ({ key: match[0].toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''), start: match.index }));
  return { text, words };
}

function compareWords(previous, current) {
  let prefix = 0;
  while (prefix < previous.length && prefix < current.length && previous[prefix].key === current[prefix].key) prefix++;
  if (prefix === previous.length && prefix === current.length) return { fresh: false, dropped: 0 };
  if (prefix === previous.length) return { fresh: true, dropped: 0, firstNew: previous.length };
  if (prefix === current.length) return { fresh: false, dropped: 0 };

  // Windows drops the front of its rolling transcript as new words arrive.
  for (let overlap = Math.min(previous.length, current.length); overlap > 0; overlap--) {
    if (previous.slice(-overlap).every((word, index) => word.key === current[index].key)) {
      return { fresh: current.length > overlap, dropped: previous.length - overlap, firstNew: overlap };
    }
  }
  if (prefix > 0) {
    const growsLastWord = previous.length === current.length && prefix === previous.length - 1 &&
      current[prefix].key.startsWith(previous[prefix].key);
    return { fresh: current.length > previous.length || growsLastWord, dropped: 0,
      firstNew: growsLastWord ? prefix : previous.length };
  }
  // A completely replaced snapshot is a new recognition segment.
  return { fresh: true, dropped: previous.length, firstNew: 0, replaced: true };
}

class CaptionCues {
  constructor({ onText, now = Date.now, schedule = setTimeout, cancel = clearTimeout,
    pauseMs = 1500, ignoreInitialSnapshot = false } = {}) {
    this.onText = onText || (() => {});
    this.now = now;
    this.schedule = schedule;
    this.cancel = cancel;
    this.pauseMs = pauseMs;
    this.ignoreInitialSnapshot = ignoreInitialSnapshot;
    this.previous = null;
    this.boundary = 0;
    this.visible = false;
    this.text = '';
    this.timer = null;
    this.cueId = 0;
    this.wordOffset = 0;
    this.lastMetadata = '';
    this.speechActive = null;
  }

  publish(text, clearReason = '') {
    const metadata = { cueId: this.cueId, wordOffset: this.wordOffset, clearReason };
    const key = JSON.stringify(metadata);
    if (text === this.text && key === this.lastMetadata) return;
    this.text = text;
    this.lastMetadata = key;
    this.onText(text, metadata);
  }

  clear({ keepSnapshot = true, reason = 'reset' } = {}) {
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    this.visible = false;
    if (!keepSnapshot) this.previous = null;
    this.publish('', reason);
  }

  setSpeechActive(active) {
    const previous = this.speechActive;
    this.speechActive = active;
    if (!this.visible) return;
    if (active === false && previous === true) this.lastWordAt = this.now();
    this.armTimer();
  }

  armTimer() {
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    // Whisper delivers batches. Keep a card during ongoing speech instead of
    // mistaking the recognition interval for silence. Windows uses inferred pauses.
    if (this.speechActive === true) return;
    const readingMs = Math.max(833, Math.min(4000, Math.min(this.text.length, 120) / 20 * 1000));
    const deadline = Math.max(this.lastWordAt + this.pauseMs, this.startedAt + readingMs);
    this.timer = this.schedule(() => this.clear({ reason:'pause' }), Math.max(0, deadline-this.now()));
  }

  update(raw) {
    const next = snapshot(raw);
    const before = this.previous;
    const change = before ? compareWords(before.words, next.words) : { fresh: next.words.length > 0, firstNew: 0, dropped: 0 };
    this.previous = next;
    // An already-running Windows caption window can contain earlier dialogue.
    // Establish its baseline and begin with the next newly recognized words.
    if (!before && this.ignoreInitialSnapshot) return;
    if (!next.words.length) { this.clear(); return; }
    const time = this.now();
    if (!this.visible) {
      // Punctuation/case corrections and repeated snapshots must not resurrect old captions.
      if (!change.fresh) return;
      this.visible = true;
      this.cueId++;
      this.wordOffset = 0;
      this.boundary = change.firstNew;
      this.startedAt = time;
    } else {
      this.wordOffset += Math.max(0, change.dropped - this.boundary);
      this.boundary = Math.max(0, this.boundary - change.dropped);
      if (change.replaced) { this.boundary = 0; this.startedAt = time; this.cueId++; this.wordOffset = 0; }
    }
    if (change.fresh) this.lastWordAt = time;
    const start = next.words[Math.min(this.boundary, next.words.length - 1)].start;
    const text = next.text.slice(start);
    this.publish(text);
    this.armTimer();
  }
}

module.exports = { CaptionCues, compareWords };
