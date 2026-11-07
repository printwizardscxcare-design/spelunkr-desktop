'use strict';
const {EventEmitter} = require('node:events');
const {spawn} = require('node:child_process');
const readline = require('node:readline');

function sourceRequest(value) {
  if (!value || !Number.isFinite(value.startMs) || value.startMs < 0 || value.startMs > 864000000 ||
    !Number.isSafeInteger(value.session) || value.session < 1 || typeof value.url !== 'string' || value.url.length > 4096) throw Error('Invalid caption source.');
  const url = new URL(value.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
    !(url.hostname === 'archive.org' || url.hostname.endsWith('.archive.org'))) throw Error('Buffered captions require an Internet Archive video source.');
  return {url: url.href, startMs: Math.floor(value.startMs), session: value.session};
}

// Recognition consumes the actual channel file ahead of the visible player's
// clock. Pipe backpressure bounds the decoded audio; captions stay in memory.
class CaptionReadAhead extends EventEmitter {
  constructor({ffmpeg, helper, spawnProcess = spawn, aheadMs = 24000, readyMs = 15000}) {
    super();Object.assign(this,{ffmpeg,helper,spawnProcess,aheadMs,readyMs});this.run = null;
  }
  start(request, speed = 'fast') {
    const source = sourceRequest(request);this.stop();
    const run = {source, clock: source.startMs, sentBytes: 0, processed: source.startMs, ready: false, stopped: false, wake: null, eof: false};
    this.run = run;
    const caption = run.caption = this.spawnProcess(this.helper,['--pcm','--timed','--model',speed === 'balanced' ? 'base.en' : 'tiny.en'],
      {windowsHide:true,stdio:['pipe','pipe','pipe']});
    const audio = run.audio = this.spawnProcess(this.ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-protocol_whitelist','https,http,tls,tcp,crypto',
      '-rw_timeout','30000000','-reconnect','1','-reconnect_streamed','1','-reconnect_on_network_error','1','-reconnect_delay_max','3',
      '-ss',String(source.startMs / 1000),'-i',source.url,'-vn','-sn','-dn','-ac','1','-af','highpass=f=60','-ar','16000','-f','s16le','pipe:1'],
      {windowsHide:true,stdio:['ignore','pipe','pipe']});
    const fail = message => {if (this.run !== run || run.stopped) return;this.stop();this.emit('failure',message);};
    run.timer = setTimeout(() => fail('The subtitle buffer could not fill. Check the connection and try again.'),90000);run.timer.unref?.();
    const ready = () => {
      if (!run.ready && (run.processed >= run.clock + this.readyMs || run.eof && run.processed > run.clock)) {
        run.ready = true;clearTimeout(run.timer);this.emit('ready',{session:source.session,untilMs:run.processed});
      }
    };
    const lines = run.lines = readline.createInterface({input:caption.stdout});
    lines.on('line',line => {
      if (run.stopped || this.run !== run || line.length > 16384) return;
      try {
        const event = JSON.parse(line);
        if (event.type === 'error') {fail('Whisper could not prepare subtitles. Try Faster recognition or restart captions.');return;}
        if (event.type === 'progress' && Number.isFinite(event.untilMs) && event.untilMs >= 0 && event.untilMs <= run.sentBytes / 32 + 1000) {
          run.processed = Math.max(run.processed,source.startMs + event.untilMs);ready();
          if (process.env.SPELUNKR_CAPTION_DEBUG) console.error('Subtitle buffer',JSON.stringify({session:source.session,startMs:source.startMs,clockMs:run.clock,sentMs:run.sentBytes/32,processedMs:run.processed,ready:run.ready}));
          this.emit('progress',{session:source.session,untilMs:run.processed});
        } else if (event.type === 'cue' && typeof event.text === 'string' && event.text.length <= 2048 &&
          Number.isFinite(event.startMs) && Number.isFinite(event.endMs) && event.startMs >= 0 && event.endMs > event.startMs && event.endMs <= run.sentBytes / 32 + 1000) {
          if (process.env.SPELUNKR_CAPTION_DEBUG) console.error('Subtitle cue',JSON.stringify({session:source.session,startMs:source.startMs+event.startMs,endMs:source.startMs+event.endMs,characters:event.text.length}));
          this.emit('cue',{session:source.session,text:event.text.trim(),startMs:source.startMs + event.startMs,endMs:source.startMs + event.endMs});
        }
      } catch {}
    });
    caption.stderr.resume();audio.stderr.resume();caption.stdin.on('error',()=>{});
    caption.once('error',() => fail('The bundled speech recognizer could not start.'));
    audio.once('error',() => fail('The bundled channel audio reader could not start.'));
    audio.once('close',code => {if (code !== 0 && !run.stopped) fail('The channel audio could not be read for subtitles. Try reloading the channel.');});
    caption.once('close',code => {
      if (run.stopped) return;
      if (code !== 0 || !run.eof) fail('Subtitle recognition stopped before the channel audio finished.');
      else {ready();clearTimeout(run.timer);this.emit('complete',{session:source.session,untilMs:run.processed});}
    });
    (async () => {
      try {
        for await (const chunk of audio.stdout) {
          while (!run.stopped && source.startMs + run.sentBytes / 32 >= run.clock + this.aheadMs) await new Promise(resolve => {run.wake = resolve;});
          if (run.stopped) break;
          run.sentBytes += chunk.length;
          if (!caption.stdin.write(chunk)) await new Promise(resolve => {
            const done = () => {
              caption.stdin.removeListener('drain',done);caption.stdin.removeListener('error',done);caption.removeListener('close',done);resolve();
            };
            caption.stdin.once('drain',done);caption.stdin.once('error',done);caption.once('close',done);
          });
        }
        if (!run.stopped) {run.eof = true;caption.stdin.end();ready();}
      } catch {if (!run.stopped) fail('The subtitle buffer lost its audio connection. Toggle captions to try again.');}
    })();
    return source;
  }
  clock(session, milliseconds) {
    const run = this.run;
    if (!run || run.source.session !== session || !Number.isFinite(milliseconds) || milliseconds < 0) return;
    run.clock = milliseconds;run.wake?.();run.wake = null;
  }
  stop() {
    const run = this.run;this.run = null;
    if (!run) return;
    run.stopped = true;clearTimeout(run.timer);run.wake?.();run.lines?.close();
    for (const child of [run.audio,run.caption]) if (child && child.exitCode === null && child.signalCode === null) {
      child.stdin?.destroy();child.kill();
      const force = setTimeout(() => {if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');},1500);force.unref?.();
    }
  }
}
module.exports = {CaptionReadAhead,sourceRequest};
