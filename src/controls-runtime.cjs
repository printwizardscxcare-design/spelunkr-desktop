'use strict';

module.exports = function installControls({model, ipcRenderer, document, window, navigator = {}, platform = 'win32'}) {
  let current = model.defaults(platform), suspended = false;
  const tracker = new model.GamepadTracker();
  const legacyKeys = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyM','KeyR','KeyC','KeyF','KeyG','KeyH','KeyW','KeyS',
    'MediaPlayPause','MediaPlay','MediaPause','MediaFastForward','MediaRewind','ChannelUp','ChannelDown']);
  const video = () => document.querySelector('.stage-video-col video, video');
  const text = element => String(element.getAttribute?.('aria-label') || element.getAttribute?.('title') || element.textContent || element.value || '').replace(/\s+/g,' ').trim();
  const visible = element => !element.getClientRects || element.getClientRects().length > 0;
  const pageElements = () => [...document.querySelectorAll('button, a[href], input[type="button"], input[type="submit"], [role="button"]')].filter(visible);
  const descriptor = element => model.pageAction({label: text(element), match: {
    tag: ['A','INPUT'].includes(element.tagName) ? element.tagName : 'BUTTON', id: element.id || '',
    ...(element.tagName === 'A' ? {href: element.href} : {}), label: text(element)
  }});
  const click = (selector, pattern) => {
    const element = selector && document.querySelector(selector) || (pattern && pageElements().find(e => e.tagName !== 'A' && pattern.test(text(e))));
    if (!element || element.disabled || typeof element.click !== 'function') return false;
    element.click(); return true;
  };
  const seek = amount => {
    const player = video();
    if (!player || !Number.isFinite(player.currentTime)) return false;
    const start = player.seekable?.length ? player.seekable.start(0) : 0;
    const end = player.seekable?.length ? player.seekable.end(player.seekable.length - 1) : Number.isFinite(player.duration) ? player.duration : Infinity;
    player.currentTime = Math.max(start, Math.min(end, player.currentTime + amount));
    return true;
  };
  const changeVolume = amount => {
    const slider = document.querySelector('input.player-volume-slider, input[type="range"][aria-label="Volume"]');
    const player = video();
    const before = slider ? Number(slider.value) : player?.muted ? 0 : player?.volume;
    if (!Number.isFinite(before)) return false;
    const value = Math.max(0, Math.min(1, Math.round((before + amount) * 100) / 100));
    if (slider) {
      const setter = window.HTMLInputElement && Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) setter.call(slider, String(value)); else slider.value = String(value);
      slider.dispatchEvent(new window.Event('input', {bubbles: true}));
      slider.dispatchEvent(new window.Event('change', {bubbles: true}));
    } else {player.volume = value; if (value > 0) player.muted = false;}
    return true;
  };
  const blocked = target => !!(target?.isContentEditable || target?.closest?.('input, textarea, select, [contenteditable="true"], [role="textbox"], [role="slider"], [role="dialog"], .cc-panel') ||
    [...document.querySelectorAll('[role="dialog"]')].some(element => element.getClientRects().length));
  function run(id, repeat = false) {
    const definition = model.actions(platform, current.pageActions).find(action => action.id === id);
    if (!definition || repeat && !definition.repeat || suspended) return false;
    if (definition.native) {ipcRenderer.send('controls:action', id);return true;}
    switch (id) {
      case 'channelNext': case 'channelPrevious':
        window.dispatchEvent(new window.KeyboardEvent('keydown', {key: id === 'channelNext' ? 'ChannelUp' : 'ChannelDown', bubbles: true, cancelable: true}));return true;
      case 'volumeUp': return changeVolume(.05);
      case 'volumeDown': return changeVolume(-.05);
      case 'mute': if (click(null, /^(?:Unmute|Mute)(?:\b|\s*\()/i)) return true; if (video()) {video().muted = !video().muted;return true;} return false;
      case 'playPause':
        if (click(null, /^(?:Play|Pause)(?:\s*\(.*\))?$/i)) return true;
        if (!video()) return false;
        if (video().paused) video().play()?.catch?.(() => {});else video().pause();return true;
      case 'rewind': return document.querySelector('#stage-key-rw') ? click('#stage-key-rw') : seek(-15);
      case 'forward': return document.querySelector('#stage-key-ff') ? click('#stage-key-ff') : seek(15);
      case 'live': return click(null, /^(?:LIVE|Go live|Return to live|Back to live)$/i);
      case 'randomChannel': return click(null, /Random Channel|^SPELUNK(?:\s*\(R\))?$/i);
      case 'pictureInPicture': return click('#stage-key-float');
      case 'hideComments': return click('#stage-key-hide');
      case 'watch': return click(null, /^WATCH$/i);
      case 'channelDetails': return click(null, /^(?:View channel|CHANNEL)$/i);
      case 'comment': return click(null, /^(?:Add comment|Comment)(?:\s*\(.*\))?$/i);
      case 'reactions': return click(null, /^(?:React|Reactions)(?:\s*\(.*\))?$/i);
      default: {
        const action = current.pageActions.find(a => a.id === id);
        if (!action) return false;
        const element = pageElements().find(element => descriptor(element)?.id === action.id);
        if (!element || element.disabled || typeof element.click !== 'function') return false;
        element.click();return true;
      }
    }
  }
  window.addEventListener('keydown', event => {
    if (event.code === 'Escape' && document.fullscreenElement) return; // Keep the browser's fullscreen exit available.
    if (event.isTrusted !== true || blocked(event.target)) return;
    const action = model.keyAction(event, current);
    if (action) {
      event.preventDefault();event.stopImmediatePropagation();if (!suspended) run(action, event.repeat === true);
    } else if (!event.ctrlKey && !event.metaKey && !event.altKey && legacyKeys.has(model.normalizeKey(event)?.code)) {
      // An unassigned key must not fall through to the site's older shortcuts.
      event.preventDefault();event.stopImmediatePropagation();
    }
  }, true);
  ipcRenderer.on('desktop:controls-state', (_event, incoming) => {
    try {current = model.config(incoming.config, platform);suspended = incoming.suspended === true;tracker.reset();} catch {}
  });
  ipcRenderer.on('desktop:controls-query', () => {
    const pages = [];
    for (const element of pageElements()) {
      const action = descriptor(element);
      if (action && !pages.some(a => a.id === action.id)) pages.push(action);
      if (pages.length >= 128) break;
    }
    ipcRenderer.send('controls:catalog', pages);
  });
  const ready = () => ipcRenderer.send('controls:ready');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once: true});else ready();
  if (typeof window.requestAnimationFrame === 'function' && typeof navigator.getGamepads === 'function') {
    const poll = () => {
      if (suspended || document.visibilityState === 'hidden' || !document.hasFocus() || blocked(document.activeElement)) tracker.reset();
      else {
        try {
          for (const event of tracker.sample(navigator.getGamepads())) {
            const action = model.gamepadAction(event, current);
            if (action) run(action, event.repeat);
          }
        } catch {tracker.reset();}
      }
      window.requestAnimationFrame(poll);
    };
    window.requestAnimationFrame(poll);
  }
  return {run, seek, changeVolume};
};
