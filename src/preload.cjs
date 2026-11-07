'use strict';

// Runs in an isolated world. No Node or IPC functions are exposed to the site.
const { ipcRenderer } = require('electron');
if (location.origin === 'https://spelunkr.tv' && process.isMainFrame) {
  if (document.addEventListener) {
    let overlay;
    let line;
    let measureContext;
    const pages = new CaptionPages({ now: () => Date.now() });
    let state = { enabled: false, color: 'white', size: 1, text: '' };
    const place = () => {
      if (!overlay) return;
      const root = document.fullscreenElement || document.documentElement;
      if (overlay.parentNode !== root) root.appendChild(overlay);
      const video = document.querySelector('.stage-video-col video, video');
      const rectangle = video?.getBoundingClientRect();
      const fullscreen = !!document.fullscreenElement;
      const visibleVideo = rectangle && rectangle.width > 0 && rectangle.height > 0 && rectangle.bottom > 0 && rectangle.top < innerHeight;
      overlay.style.left = fullscreen ? '0px' : `${Math.max(0, rectangle?.left || 0)}px`;
      overlay.style.width = fullscreen ? '100%' : `${rectangle?.width || 0}px`;
      overlay.style.bottom = fullscreen ? '8%' : `${Math.max(0, innerHeight - (rectangle?.bottom || 0)) + Math.max(18, (rectangle?.height || 0) * .06)}px`;
      if (line) {
        const width = fullscreen ? innerWidth : rectangle?.width || 900;
        const fontSize = (fullscreen ? Math.max(24, Math.min(80, innerHeight * .04)) : Math.max(20, Math.min(42, width * .026))) * state.size;
        measureContext.font = `600 ${fontSize}px "Segoe UI",sans-serif`;
        const page = pages.render(Math.max(1, width * (fullscreen ? .9 : .86) - 4), text => measureContext.measureText(text).width);
        line.style.fontSize = `${fontSize * page.scale}px`;
        line.style.maxWidth = fullscreen ? '90%' : '86%';
        line.textContent = page.text;
        overlay.style.display = state.enabled && page.text && (fullscreen || visibleVideo) ? 'flex' : 'none';
      }
    };
    const ensureOverlay = () => {
      if (overlay || !document.documentElement) return;
      overlay = document.createElement('div');
      overlay.id = 'spelunkr-desktop-caption-overlay';
      overlay.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none!important;background:transparent!important;justify-content:center;align-items:flex-end;box-shadow:none!important;border:0!important;margin:0!important;padding:0!important;';
      const shadow = overlay.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = ':host{background:transparent!important;pointer-events:none!important}span{display:block;max-width:86%;background:transparent!important;border:0;box-shadow:none;padding:0;margin:0;text-align:center;font:600 clamp(22px,2.6vw,42px)/1.25 "Segoe UI",sans-serif;letter-spacing:normal;word-spacing:normal;white-space:pre;text-wrap:nowrap;text-shadow:0 1px 3px #000,1px 0 2px #000,-1px 0 2px #000,0 -1px 2px #000;}';
      line = document.createElement('span');
      measureContext = document.createElement('canvas').getContext('2d');
      shadow.append(style, line);
      place();
    };
    ipcRenderer.on('desktop:captions', (_event, incoming) => {
      if (!incoming || typeof incoming.text !== 'string') return;
      let text = incoming.text.replace(/\s+/g, ' ').trim();
      state = { enabled: incoming.enabled === true, color: incoming.color === 'yellow' ? 'yellow' : 'white',
        size: [0.8, 1, 1.25, 1.5, 2].includes(incoming.size) ? incoming.size : 1, text };
      pages.receive({ enabled: state.enabled, text, cueId: Number.isSafeInteger(incoming.cueId) ? incoming.cueId : 0,
        wordOffset: Number.isSafeInteger(incoming.wordOffset) && incoming.wordOffset >= 0 ? incoming.wordOffset : 0,
        clearReason: incoming.clearReason });
      ensureOverlay();
      if (line) { line.textContent = state.text; line.style.color = state.color === 'yellow' ? '#ffeb3b' : '#ffffff'; }
      place();
    });
    document.addEventListener('DOMContentLoaded', ensureOverlay);
    document.addEventListener('fullscreenchange', place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    // Track the live site's video layout without reading or changing its app state.
    setInterval(place, 100);
  }
  let desktopFullscreen = false;
  ipcRenderer.on('desktop:fullscreen', (_event, value) => { desktopFullscreen = value === true; });

  window.addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key) || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    if (!desktopFullscreen && !document.fullscreenElement) return;
    const target = event.target;
    if (target?.isContentEditable || target?.closest?.('input, textarea, select, [contenteditable="true"], [role="textbox"], [role="slider"], [role="dialog"], .cc-panel')) return;
    if ([...document.querySelectorAll('[role="dialog"]')].some(element => element.getClientRects().length)) return;

    // The live site already understands TV remote ChannelUp/ChannelDown events.
    // Use its channel controls so playback and HTML fullscreen stay in place.
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: event.key === 'ArrowUp' ? 'ChannelUp' : 'ChannelDown',
      bubbles: true,
      cancelable: true
    }));
  }, true);
}
