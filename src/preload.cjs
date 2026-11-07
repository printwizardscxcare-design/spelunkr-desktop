'use strict';

// Runs in an isolated world. No Node or IPC functions are exposed to the site.
const { ipcRenderer } = require('electron');
if (location.origin === 'https://spelunkr.tv' && process.isMainFrame) {
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
