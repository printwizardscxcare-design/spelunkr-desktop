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
    this.sourceOffset = null;
    this.sourceUtterance = null;
    this.lastClearReason = '';
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
    if (!keepSnapshot) {this.previous = null;this.sourceOffset = this.sourceUtterance = null;}
    this.lastClearReason = reason;
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
    const readingMs = Math.max(833, Math.min(4000, Math.min(this.text.length, 120) / 20 * 1000));
    const pauseDeadline = Math.max(this.lastWordAt + this.pauseMs, this.startedAt + readingMs);
    // TV music/noise can keep VAD active. A speech flag alone must not preserve
    // stale text forever, even if speech/silence events keep alternating.
    const staleDeadline = Math.max(this.lastRecognitionAt + 4500, this.startedAt + readingMs);
    const deadline = this.speechActive === true ? staleDeadline :
      this.speechActive === false ? Math.min(pauseDeadline, staleDeadline) : pauseDeadline;
    this.timer = this.schedule(() => this.clear({ reason:'pause' }), Math.max(0, deadline-this.now()));
  }

  update(raw, source) {
    const next = snapshot(raw);
    const before = this.previous;
    const native = source && ['wordOffset','utteranceStart','utteranceId'].every(key => Number.isSafeInteger(source[key]) && source[key] >= 0);
    const previousUtterance = this.sourceUtterance;
    let change = before ? compareWords(before.words, next.words) : { fresh: next.words.length > 0, firstNew: 0, dropped: 0 };
    if (native && before && this.sourceOffset !== null) {
      const previousEnd = this.sourceOffset + before.words.length;
      change = {fresh: source.wordOffset + next.words.length > previousEnd,
        firstNew: Math.max(0, previousEnd - source.wordOffset), dropped: Math.max(0, source.wordOffset - this.sourceOffset)};
      if (!this.visible && previousUtterance !== source.utteranceId) {
        change.firstNew = Math.max(0, source.utteranceStart - source.wordOffset);
        change.fresh = next.words.length > change.firstNew;
      }
    }
    this.sourceOffset = native ? source.wordOffset : null;
    this.sourceUtterance = native ? source.utteranceId : null;
    this.previous = next;
    if (native && !this.visible && this.lastClearReason === 'pause' && previousUtterance === source.utteranceId && this.speechActive === false) return;
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
    if (change.fresh) this.lastRecognitionAt = this.lastWordAt = time;
    const start = next.words[Math.min(this.boundary, next.words.length - 1)].start;
    const text = next.text.slice(start);
    this.publish(text);
    this.armTimer();
  }
}

module.exports = { CaptionCues, compareWords };
