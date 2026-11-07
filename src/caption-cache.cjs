'use strict';

class CaptionCache {
  constructor() {this.reset();}
  reset(session = 0) {this.session = session;this.cues = [];}
  add(cue) {
    if (cue.session !== this.session || typeof cue.text !== 'string' || !cue.text.trim() ||
      !Number.isFinite(cue.startMs) || !Number.isFinite(cue.endMs) || cue.endMs <= cue.startMs) return;
    if (this.cues.some(item => item.startMs === cue.startMs && item.endMs === cue.endMs && item.text === cue.text)) return;
    const previous = this.cues.at(-1);
    // Keep a short sentence tail with its preceding cue instead of flashing a
    // few words for a fraction of a second. Read-ahead supplies both in advance.
    if (previous && cue.startMs >= previous.startMs && Math.abs(cue.startMs-previous.endMs)<=120 &&
      (cue.endMs-cue.startMs<833 || previous.endMs-previous.startMs<833) && previous.text.length+cue.text.trim().length<100) {
      previous.text += ' '+cue.text.trim();previous.endMs=Math.max(previous.endMs,cue.endMs);return;
    }
    this.cues.push({...cue,text:cue.text.trim()});this.cues.sort((a,b) => a.startMs - b.startMs);
    if (this.cues.length > 1000) this.cues.splice(0,this.cues.length - 1000);
  }
  render(time, width, measure) {
    // Media time, rather than recognition arrival or a wall clock, owns display.
    const active = this.cues.filter(cue => cue.startMs <= time && time < cue.endMs).at(-1);
    if (!active) return {text:'',scale:1};
    const cards = [], words = active.text.split(/\s+/);let lines = [''],scale = 1;
    for (const word of words) {
      const index = lines.length - 1, candidate = lines[index] ? lines[index] + ' ' + word : word;
      if (lines[index] && measure(candidate) > width) {
        if (lines.length === 2) {cards.push(lines.join('\n'));lines = [word];}
        else lines.push(word);
      } else lines[index] = candidate;
      scale = Math.min(scale,width / Math.max(width,measure(word)));
    }
    if (lines[0]) cards.push(lines.join('\n'));
    const total = cards.reduce((sum,card) => sum + card.length,0);
    const position = (time-active.startMs)/(active.endMs-active.startMs)*total;
    let consumed = 0;
    for (const card of cards) {consumed += card.length;if (position < consumed) return {text:card,scale};}
    return {text:cards.at(-1) || '',scale};
  }
}
module.exports = {CaptionCache};
