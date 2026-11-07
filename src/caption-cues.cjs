'use strict';

function snapshot(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  const words = [...text.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)]
    .map(match => ({ key: match[0].toLowerCase(), start: match.index }));
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
    pauseMs = 1500 } = {}) {
    this.onText = onText || (() => {});
    this.now = now;
    this.schedule = schedule;
    this.cancel = cancel;
    this.pauseMs = pauseMs;
    this.previous = null;
    this.boundary = 0;
    this.visible = false;
    this.text = '';
    this.timer = null;
  }

  publish(text) {
    if (text === this.text) return;
    this.text = text;
    this.onText(text);
  }

  clear({ keepSnapshot = true } = {}) {
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    this.visible = false;
    if (!keepSnapshot) this.previous = null;
    this.publish('');
  }

  update(raw) {
    const next = snapshot(raw);
    const before = this.previous;
    const change = before ? compareWords(before.words, next.words) : { fresh: next.words.length > 0, firstNew: 0, dropped: 0 };
    this.previous = next;
    if (!next.words.length) { this.clear(); return; }
    const time = this.now();
    if (!this.visible) {
      // Punctuation/case corrections and repeated snapshots must not resurrect old captions.
      if (!change.fresh) return;
      this.visible = true;
      this.boundary = change.firstNew;
      this.startedAt = time;
    } else {
      this.boundary = Math.max(0, this.boundary - change.dropped);
      if (change.replaced) { this.boundary = 0; this.startedAt = time; }
    }
    if (change.fresh) this.lastWordAt = time;
    const start = next.words[Math.min(this.boundary, next.words.length - 1)].start;
    let text = next.text.slice(start);
    // Keep enough text for wide fullscreen views while bounding local display work.
    if (text.length > 360) {
      text = text.slice(-360);
      const word = text.indexOf(' ');
      if (word >= 0 && word < 30) text = text.slice(word + 1);
    }
    this.publish(text);
    if (this.timer !== null) this.cancel(this.timer);
    // Prepared subtitles often linger briefly after speech. Live Windows text has no
    // speech-end timestamps: infer a pause from new-word activity, then allow a short
    // reading window for text arriving in a batch. Corrections do not restart the clock.
    const readingMs = Math.max(833, Math.min(4000, Math.min(text.length, 120) / 20 * 1000));
    const deadline = Math.max(this.lastWordAt + this.pauseMs, this.startedAt + readingMs);
    this.timer = this.schedule(() => this.clear(), Math.max(0, deadline - time));
  }
}

module.exports = { CaptionCues, compareWords };
