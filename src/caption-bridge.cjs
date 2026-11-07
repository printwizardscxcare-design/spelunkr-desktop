'use strict';
const { EventEmitter } = require('node:events');
const { spawn } = require('node:child_process');
const readline = require('node:readline');

class CaptionBridge extends EventEmitter {
  constructor(executable) { super(); this.executable = executable; this.child = null; }
  start() {
    if (this.child) return;
    const child = spawn(this.executable, [], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child = child;
    let reportedError = false;
    const lines = readline.createInterface({ input: child.stdout });
    lines.on('line', line => {
      try {
        const item = JSON.parse(line);
        if (!['caption', 'status', 'error'].includes(item.type) || typeof item.text !== 'string') return;
        if (item.type === 'error') reportedError = true;
        this.emit(item.type === 'error' ? 'failure' : item.type, item.text.slice(-8192));
      } catch {}
    });
    child.stderr.resume();
    child.stdin.on('error', () => {});
    child.on('error', () => {
      reportedError = true;
      this.emit('failure', 'The captions helper could not start. Check your installation and caption setup.');
    });
    child.once('close', code => {
      lines.close();
      if (this.child === child) this.child = null;
      if (code && !reportedError) this.emit('failure', 'The captions connection stopped. Try enabling in-app captions again.');
      this.emit('stopped');
    });
  }
  stop() {
    const child = this.child;
    if (!child) return Promise.resolve();
    return new Promise(resolve => {
      const timeout = setTimeout(() => { child.kill(); resolve(); }, 4000);
      child.once('close', () => { clearTimeout(timeout); resolve(); });
      child.stdin.end('stop\n');
    });
  }
}
module.exports = { CaptionBridge };
