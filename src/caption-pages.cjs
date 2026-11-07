'use strict';

// Display complete, non-scrolling subtitle cards. Token positions are supplied by
// CaptionCues so Windows rolling its transcript does not move the current card.
class CaptionPages {
  constructor({ now = Date.now } = {}) {
    this.now = now;
    this.reset();
  }

  reset() { this.segments = []; this.finished = new Set(); }

  receive({ enabled, text, cueId = 0, wordOffset = 0, clearReason = 'reset' }) {
    if (!enabled) { this.reset(); return; }
    if (!text) {
      if (clearReason !== 'pause') { this.reset(); return; }
      // Cue timing has already allowed reading time. A real pause must clear
      // the overlay instead of draining old queued cards over silent video.
      while (this.segments.length) this.finish(this.segments[0]);
      return;
    }
    if (this.finished.has(cueId)) return;
    let segment = this.segments.find(item => item.id === cueId);
    if (!segment) {
      for (const item of this.segments) item.ended = true;
      segment = { id: cueId, words: new Map(), start: wordOffset, end: wordOffset, shownAt: null, ended: false };
      this.segments.push(segment);
    }
    const words = [];
    for (const token of text.match(/\S+/gu) || []) {
      if (/[\p{L}\p{N}]/u.test(token) || !words.length) words.push(token);
      else words[words.length - 1] += ` ${token}`;
    }
    words.forEach((word, index) => segment.words.set(wordOffset + index, word));
    segment.end = wordOffset + words.length;
    // Keep recognized revisions in the current and pending cards, never a consumed card.
    for (const position of segment.words.keys()) {
      if (position < segment.start || position >= segment.end) segment.words.delete(position);
    }
  }

  layout(segment, width, measure) {
    const lines = [''];
    let count = 0;
    let scale = 1;
    for (let index = segment.start; index < segment.end; index++) {
      const word = segment.words.get(index);
      if (word === undefined) break;
      const last = lines.length - 1;
      const candidate = lines[last] ? `${lines[last]} ${word}` : word;
      if (lines[last] && measure(candidate) > width) {
        if (lines.length === 2) break;
        lines.push(word);
      } else lines[last] = candidate;
      // An exceptionally long single word is fitted intact rather than discarded.
      scale = Math.min(scale, width / Math.max(width, measure(word)));
      count++;
    }
    return { text: lines.join('\n'), count, scale };
  }

  render(width, measure) {
    const time = this.now();
    // Skip exhausted segments, but never skip an unread card in a recognition burst.
    while (this.segments.length) {
      const segment = this.segments[0];
      if (segment.start >= segment.end || !segment.words.has(segment.start)) {
        if (!segment.ended) return { text: '', scale: 1 };
        this.finish(segment);
        continue;
      }
      if (segment.shownAt === null) segment.shownAt = time;
      let page = this.layout(segment, width, measure);
      const hold = Math.max(833, Math.min(4000, page.text.replace('\n', ' ').length / 20 * 1000));
      const overflow = segment.start + page.count < segment.end;
      if (time >= segment.shownAt + hold && (overflow || segment.ended)) {
        segment.start += page.count;
        for (const position of segment.words.keys()) if (position < segment.start) segment.words.delete(position);
        segment.shownAt = time;
        if (segment.start >= segment.end && segment.ended) { this.finish(segment); continue; }
        page = this.layout(segment, width, measure);
      }
      return { text: page.text, scale: page.scale };
    }
    return { text: '', scale: 1 };
  }

  finish(segment) {
    this.finished.add(segment.id);
    if (this.finished.size > 100) this.finished.delete(this.finished.values().next().value);
    this.segments.shift();
  }
}

module.exports = { CaptionPages };
