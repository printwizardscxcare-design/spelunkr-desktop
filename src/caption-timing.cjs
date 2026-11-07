'use strict';

// Delay changes apply to pending cues by their original arrival time. Display and
// pause events share the same clock so a delayed clear cannot overtake its text.
class CaptionTiming {
  constructor({onCue, now = () => performance.now(), schedule = setTimeout, cancel = clearTimeout} = {}) {
    this.onCue = onCue || (() => {});
    this.now = now;
    this.schedule = schedule;
    this.cancel = cancel;
    this.delayMs = 0;
    this.pending = [];
    this.timer = null;
  }

  setDelay(milliseconds) {
    if (!Number.isInteger(milliseconds) || milliseconds < 0 || milliseconds > 10000) throw Error('Subtitle delay must be between 0 and 10 seconds.');
    this.delayMs = milliseconds;
    this.flush();
  }

  receive(text, metadata) {
    if (!text && metadata.clearReason !== 'pause') {
      // Turning off, seeking, and changing channel must clear immediately.
      this.reset();
      this.onCue(text, metadata);
      return;
    }
    this.pending.push({text, metadata: {...metadata}, receivedAt: this.now()});
    this.flush();
  }

  flush() {
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    const time = this.now();
    while (this.pending.length && this.pending[0].receivedAt + this.delayMs <= time) {
      const cue = this.pending.shift();
      this.onCue(cue.text, cue.metadata);
    }
    if (this.pending.length) this.timer = this.schedule(() => this.flush(), Math.max(0, this.pending[0].receivedAt + this.delayMs - time));
  }

  reset() {
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    this.pending = [];
  }
}

module.exports = {CaptionTiming};
