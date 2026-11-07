'use strict';

// Executed with a user gesture by Electron, only on the pinned site origin.
function toggleVideoFullscreen() {
  if (location.origin !== 'https://spelunkr.tv') return false;
  if (document.fullscreenElement) return document.exitFullscreen();
  const button = document.querySelector('.player-fullscreen-btn');
  if (button && !button.disabled) {button.click();return true;}
  const player = document.querySelector('.stage');
  if (player?.requestFullscreen) return player.requestFullscreen();
  return false;
}
module.exports = {toggleVideoFullscreen};
