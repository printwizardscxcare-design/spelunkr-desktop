'use strict';
const { EventEmitter } = require('node:events');
const { spawn } = require('node:child_process');
const readline = require('node:readline');

class CaptionBridge extends EventEmitter {
  constructor(executable, options = {}) {
    super(); this.executable = executable; this.args = options.args || [];
    this.capture = options.capture || null; this.child = null; this.source = null; this.stopping = false;
  }
  configure({ executable, args = [], capture = null }) {
    if (this.child) throw new Error('Stop captions before changing engines');
    this.executable = executable; this.args = args; this.capture = capture;
  }
  start() {
    if (this.child) return;
    this.stopping = false;
    const child = spawn(this.executable, this.args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child = child;
    let reportedError = false;
    let active = true;
    const fail = message => {
      if (this.stopping || reportedError || !active) return;
      reportedError = true; this.emit('failure', message);
    };
    const lines = readline.createInterface({ input: child.stdout });
    lines.on('line', line => {
      try {
        const item = JSON.parse(line);
        if (!['caption', 'status', 'error', 'activity'].includes(item.type) || typeof item.text !== 'string') return;
        if (item.type === 'error') fail(item.text.slice(-8192));
        else if (!this.stopping) {
          const source = item.type === 'caption' && ['wordOffset','utteranceStart','utteranceId'].every(key => Number.isSafeInteger(item[key]) && item[key] >= 0) ?
            {wordOffset: item.wordOffset, utteranceStart: item.utteranceStart, utteranceId: item.utteranceId} : undefined;
          this.emit(item.type, item.text.slice(-8192), source);
        }
      } catch {}
    });
    child.stderr.resume();
    child.stdin.on('error', () => {});
    child.on('error', () => fail('The captions helper could not start. Check your installation.'));
    if (this.capture) {
      const capture = this.capture;
      const source = spawn(capture.executable, capture.args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      this.source = source;
      let lastAudio = Date.now();
      source.stdout.on('data', () => { lastAudio = Date.now(); });
      source.stderr.resume(); source.stdout.pipe(child.stdin);
      // Some output devices stop delivering callbacks during complete silence.
      // Supply silence only after an actual gap, so VAD can finish the last phrase.
      this.idleTimer = setInterval(() => {
        if (!this.stopping && Date.now()-lastAudio >= 300 && !child.stdin.writableNeedDrain && !child.stdin.destroyed)
          child.stdin.write(Buffer.alloc(2048));
      },64);
      this.idleTimer.unref();
      source.on('error', () => fail(capture.failure));
      source.once('close', () => {
        if (this.source === source) this.source = null;
        fail(capture.failure);
      });
    }
    child.once('close', () => {
      clearInterval(this.idleTimer);
      lines.close();
      if (this.child === child) this.child = null;
      if (this.source) this.source.kill();
      fail('The captions connection stopped. Try enabling in-app captions again.');
      active = false;
      this.emit('stopped');
    });
  }
  stop() {
    this.stopping = true;
    clearInterval(this.idleTimer);
    const source = this.source;
    let sourceStopped = Promise.resolve();
    if (source) {
      sourceStopped = new Promise(resolve => source.once('close', resolve));
      source.stdout.unpipe(); source.kill();
      const force = setTimeout(() => { if (source.exitCode === null && source.signalCode === null) source.kill('SIGKILL'); }, 1000);
      force.unref();
    }
    const child = this.child;
    if (!child) return sourceStopped;
    const childStopped = new Promise(resolve => {
      const timeout = setTimeout(() => child.kill('SIGKILL'), 4000);
      child.once('close', () => { clearTimeout(timeout); resolve(); });
      child.stdin.end(this.capture ? undefined : 'stop\n');
    });
    return Promise.all([childStopped, sourceStopped]);
  }
}
module.exports = { CaptionBridge };
