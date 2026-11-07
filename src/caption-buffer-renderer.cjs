'use strict';

module.exports = function installCaptionBuffer({ipcRenderer,document,window,cache,onChange}) {
  let enabled = false, speed = 'fast', delayMs = 0, session = Date.now(), video = null, url = '', buffering = false;
  let resumeAfterBuffer = false, selfSeek = false, untilMs = 0, complete = false, failed = false;
  const currentVideo = () => document.querySelector('.stage-video-col video, video');
  const prepare = rewind => {
    const player = currentVideo();
    if (!enabled || !player?.currentSrc || !Number.isFinite(player.currentTime)) return;
    const shouldResume = buffering ? resumeAfterBuffer : !player.paused;
    video = player;url = player.currentSrc;session++;cache.reset(session);
    buffering = true;resumeAfterBuffer = shouldResume;failed = complete = false;untilMs = 0;
    const earliest = player.seekable?.length ? player.seekable.start(0) : 0;
    const start = Math.max(earliest,player.currentTime - (rewind ? 15 : 0));
    player.pause();
    if (Math.abs(player.currentTime - start) > .01) {selfSeek = true;player.currentTime = start;}
    ipcRenderer.send('buffer:source',{session,url,startMs:Math.floor(start * 1000)});onChange();
  };
  const maybeResume = () => {
    if (!enabled || failed || !video || !buffering) return;
    if (untilMs >= video.currentTime * 1000 + 15000 || complete && untilMs >= video.currentTime * 1000) {
      buffering = false;
      if (resumeAfterBuffer) video.play()?.catch?.(() => {});
      onChange();
    }
  };
  ipcRenderer.on('desktop:caption-buffer',(_event,config) => {
    const wasEnabled = enabled, previousSpeed = speed;
    enabled = config?.enabled === true;speed = config?.speed === 'balanced' ? 'balanced' : 'fast';
    delayMs = Number.isInteger(config?.delayMs) ? Math.max(0,Math.min(10000,config.delayMs)) : 0;
    if (!enabled) {
      cache.reset();failed = false;
      if (buffering && resumeAfterBuffer && video) video.play()?.catch?.(() => {});
      buffering = false;video = null;url = '';onChange();return;
    }
    if (!wasEnabled || speed !== previousSpeed || config.restart) prepare(config.rewind === true && !wasEnabled);
    onChange();
  });
  ipcRenderer.on('desktop:buffer-cue',(_event,cue) => {if (enabled) {cache.add(cue);onChange();}});
  const progress = (_event,value) => {
    if (!enabled || value?.session !== session || !Number.isFinite(value.untilMs)) return;
    untilMs = Math.max(untilMs,value.untilMs);maybeResume();
  };
  ipcRenderer.on('desktop:buffer-progress',progress);
  ipcRenderer.on('desktop:buffer-ready',progress);
  ipcRenderer.on('desktop:buffer-complete',(_event,value) => {
    if (!enabled || value?.session !== session) return;
    complete = true;progress(_event,value);
  });
  ipcRenderer.on('desktop:buffer-failure',() => {
    failed = true;
    if (buffering && resumeAfterBuffer && video) video.play()?.catch?.(() => {});
    buffering = false;cache.reset();onChange();
  });
  document.addEventListener('seeking',event => {
    if (enabled && event.target === video && !selfSeek) prepare(false);
  },true);
  document.addEventListener('seeked',event => {if (event.target === video) selfSeek = false;},true);
  document.addEventListener('emptied',event => {
    if (enabled && event.target === video) {session++;cache.reset(session);url = '';ipcRenderer.send('buffer:stop');onChange();}
  },true);
  const interval = window.setInterval(() => {
    if (!enabled || failed) return;
    const player = currentVideo();
    if (player?.currentSrc && (player !== video || player.currentSrc !== url)) {prepare(false);return;}
    if (!video || !url) return;
    const time = Math.floor(video.currentTime * 1000);
    ipcRenderer.send('buffer:clock',{session,timeMs:time});
    if (!buffering && !complete && !video.paused && time + 1500 > untilMs) {
      resumeAfterBuffer = true;buffering = true;video.pause();onChange();
    }
    maybeResume();
  },250);
  window.addEventListener('beforeunload',() => window.clearInterval(interval),{once:true});
  return {
    render(width,measure) {
      if (!enabled) return null;
      if (buffering) return {text:'Preparing subtitles…',scale:1};
      if (failed || !video || video.paused) return {text:'',scale:1};
      return cache.render(video.currentTime * 1000 - delayMs,width,measure);
    }
  };
};
