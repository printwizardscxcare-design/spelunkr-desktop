'use strict';

module.exports = function installCaptionBuffer({ipcRenderer,document,window,cache,onChange,now = () => performance.now()}) {
  let enabled = false, speed = 'fast', delayMs = 0, session = Date.now(), video = null, url = '', buffering = false;
  let active = false, cooldownSeconds = 5, cooldownUntil = 0, cooling = false;
  let observedVideo = null, observedSource = '', observedPath = window.location?.pathname || '';
  let resumeAfterBuffer = false, selfSeek = false, pendingSeek = false, pendingRewind = false, untilMs = 0, complete = false, failed = false;
  let expectedSeek = 0;
  let lastClockMs = null;
  const currentVideo = () => document.querySelector('.stage-video-col video, video');
  const playerPaused = () => {
    const button = document.querySelector('.dvr-pause-btn');
    return button && typeof button.click === 'function' ? /^Play\b/i.test(button.getAttribute('title') || '') : video?.paused;
  };
  const siteKey = key => {
    if (!window.dispatchEvent || !window.KeyboardEvent) return false;
    window.dispatchEvent(new window.KeyboardEvent('keydown',{key,code:key === ' ' ? 'Space' : key,bubbles:true,cancelable:true}));return true;
  };
  const pausePlayer = paused => {
    if (!video) return;
    const button = document.querySelector('.dvr-pause-btn');
    const canClick = button && typeof button.click === 'function';
    const currentlyPaused = playerPaused();
    if (currentlyPaused === paused) return;
    if (!paused) {selfSeek = true;expectedSeek = video.currentTime;}
    if (canClick) {button.click();if (!paused) expectedSeek = video.currentTime;}
    else if (!siteKey(' ')) {if (paused) video.pause();else video.play()?.catch?.(() => {});}
  };
  const finishCooldown = () => {
    if (!cooling) return;
    cooling = false;cooldownUntil = 0;ipcRenderer.send('buffer:cooldown',false);onChange();
  };
  const channelChanged = () => {
    if (!active) return;
    // Let surfing continue even if the previous channel was still buffering.
    if (buffering && resumeAfterBuffer && video === currentVideo()) pausePlayer(false);
    session++;cache.reset(session);ipcRenderer.send('buffer:stop');
    buffering = failed = complete = pendingSeek = pendingRewind = false;
    selfSeek = false;untilMs = 0;lastClockMs = null;video = null;url = '';
    if (cooldownSeconds > 0) {
      cooling = true;cooldownUntil = 0;
      ipcRenderer.send('buffer:cooldown',true);
    } else finishCooldown();
    onChange();
  };
  const observeChannel = () => {
    const player = currentVideo(), source = player?.currentSrc || '', pathname = window.location?.pathname || '';
    const changed = pathname !== observedPath || source && observedSource && (source !== observedSource || player !== observedVideo);
    observedPath = pathname;
    if (source) {observedSource = source;observedVideo = player;}
    if (changed) channelChanged();
  };
  const prepare = rewind => {
    const player = currentVideo();
    if (!enabled || cooling || !player?.currentSrc || !Number.isFinite(player.currentTime) || player.seeking || Number.isInteger(player.readyState) && player.readyState < 2) return;
    video = player;
    const shouldResume = buffering ? resumeAfterBuffer : !playerPaused();
    url = player.currentSrc;session++;cache.reset(session);
    buffering = true;resumeAfterBuffer = shouldResume;failed = complete = false;untilMs = 0;
    const earliest = player.seekable?.length ? player.seekable.start(0) : 0;
    let start = Math.max(earliest,player.currentTime - (rewind ? 15 : 0));
    pendingRewind = false;pendingSeek = false;
    if (rewind) {
      selfSeek = true;expectedSeek = start;
      const rewindButton = document.querySelector('#stage-key-rw');
      if (rewindButton && typeof rewindButton.click === 'function' && !rewindButton.disabled) rewindButton.click();
      else if (!siteKey('ArrowLeft')) player.currentTime = start;
      start = player.currentTime;expectedSeek = start;
    }
    pausePlayer(true);
    lastClockMs = Math.floor(start * 1000);
    ipcRenderer.send('buffer:source',{session,url,startMs:Math.floor(start * 1000)});onChange();
  };
  const maybeResume = () => {
    if (!enabled || failed || !video || !buffering) return;
    if (video !== currentVideo() || video.currentSrc !== url) {observeChannel();if (!cooling) prepare(false);return;}
    if (untilMs >= video.currentTime * 1000 + 15000 || complete && untilMs >= video.currentTime * 1000) {
      buffering = false;
      if (resumeAfterBuffer) pausePlayer(false);
      onChange();
    }
  };
  ipcRenderer.on('desktop:caption-buffer',(_event,config) => {
    const wasEnabled = enabled, previousSpeed = speed;
    enabled = config?.enabled === true;speed = config?.speed === 'balanced' ? 'balanced' : 'fast';
    const wasActive = active;
    active = config?.active === true || enabled;
    const previousCooldown = cooldownSeconds;
    cooldownSeconds = Number.isInteger(config?.cooldownSeconds) && config.cooldownSeconds >= 0 && config.cooldownSeconds <= 30 ? config.cooldownSeconds : 5;
    if (!wasActive && active) {
      observedVideo = currentVideo();observedSource = observedVideo?.currentSrc || '';observedPath = window.location?.pathname || '';
    }
    if (!active) finishCooldown();
    else if (cooling && cooldownSeconds !== previousCooldown) {
      if (cooldownSeconds) cooldownUntil = 0;
      else finishCooldown();
    }
    if (!wasEnabled && enabled) pendingRewind = config.rewind === true;
    delayMs = Number.isInteger(config?.delayMs) ? Math.max(0,Math.min(10000,config.delayMs)) : 0;
    if (!enabled) {
      cache.reset();failed = false;pendingSeek = pendingRewind = false;
      if (buffering && resumeAfterBuffer && video) pausePlayer(false);
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
    if (buffering && resumeAfterBuffer && video) pausePlayer(false);
    buffering = false;cache.reset();onChange();
  });
  document.addEventListener('seeking',event => {
    if (active && event.target === currentVideo() && event.target.currentSrc !== observedSource) {observeChannel();return;}
    if (enabled && event.target === video && !(selfSeek && Math.abs(video.currentTime-expectedSeek)<1)) {
      // The site's own resume control corrects its DVR clock by a second or two.
      // Already prepared timestamps remain valid across that small correction.
      if (!buffering && lastClockMs !== null && Math.abs(video.currentTime*1000-lastClockMs)<3000 && untilMs>=video.currentTime*1000+1000) return;
      selfSeek = false;
      pendingSeek = true;session++;cache.reset(session);ipcRenderer.send('buffer:stop');
      prepare(false);onChange();
    }
  },true);
  document.addEventListener('seeked',event => {if (event.target === video) {selfSeek = false;if (pendingSeek) prepare(false);}},true);
  document.addEventListener('playing',event => {
    if (enabled && buffering && event.target === video && untilMs < video.currentTime * 1000 + 15000 && !complete) {
      resumeAfterBuffer = true;pausePlayer(true);
    }
  },true);
  document.addEventListener('emptied',event => {
    if (active && (event.target === video || event.target === observedVideo)) channelChanged();
  },true);
  window.addEventListener('spelunkr:navigate',() => {if (active) observeChannel();});
  window.addEventListener('popstate',() => {if (active) observeChannel();});
  const interval = window.setInterval(() => {
    if (!active) return;
    observeChannel();
    if (cooling) {
      const player = currentVideo();
      const slate = document.querySelector('.tuning-slate');
      const tuning = slate && (!slate.getClientRects || slate.getClientRects().length > 0);
      if (tuning || !player?.currentSrc || player.seeking || player.error || player.readyState < 3) {
        cooldownUntil = 0;onChange();return;
      }
      if (!cooldownUntil) cooldownUntil = now() + cooldownSeconds * 1000;
      if (now() < cooldownUntil) {onChange();return;}
      finishCooldown();
    }
    if (!enabled || failed) return;
    const player = currentVideo();
    if (player?.currentSrc && (player !== video || player.currentSrc !== url || pendingSeek)) {prepare(pendingRewind);return;}
    if (!video || !url) return;
    const time = Math.floor(video.currentTime * 1000);
    lastClockMs = time;
    ipcRenderer.send('buffer:clock',{session,timeMs:time});
    if (!buffering && !complete && !video.paused && time + 1500 > untilMs) {
      resumeAfterBuffer = true;buffering = true;pausePlayer(true);onChange();
    }
    maybeResume();
  },250);
  window.addEventListener('beforeunload',() => window.clearInterval(interval),{once:true});
  return {
    channelChanged,
    waitingForTune() {return active && cooling && !cooldownUntil;},
    cooldown() {return active && cooling && cooldownUntil ? Math.max(1,Math.ceil((cooldownUntil-now())/1000)) : 0;},
    render(width,measure) {
      if (active && cooling) return {text:'',scale:1};
      if (!enabled) return null;
      if (buffering || !video || pendingSeek) return {text:'Preparing subtitles…',scale:1};
      if (failed || !video || video.paused) return {text:'',scale:1};
      return cache.render(video.currentTime * 1000 - delayMs,width,measure);
    }
  };
};
