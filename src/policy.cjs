'use strict';

const HOME = 'https://spelunkr.tv/';
const AUTH_ORIGIN = 'https://jbuopkuluyfjwgsrigry.supabase.co';

function parseUrl(value) {
  try { return new URL(value); } catch { return null; }
}

function isSite(value) {
  const url = parseUrl(value);
  return !!url && url.origin === new URL(HOME).origin && !url.username && !url.password;
}

function isTrustedNavigation(value) {
  if (isSite(value)) return true;
  const url = parseUrl(value);
  if (!url || url.username || url.password) return false;
  return (url.origin === AUTH_ORIGIN && url.pathname.startsWith('/auth/v1/')) ||
    (url.origin === 'https://discord.com' && /^\/(oauth2(?:\/|$)|api\/oauth2(?:\/|$)|login(?:\/|$)|register(?:\/|$))/.test(url.pathname));
}

function isExternalUrl(value) {
  const url = parseUrl(value);
  return !!url && url.protocol === 'https:' && !url.username && !url.password;
}

function safeWindowState(value, workAreas) {
  const fallback = { width: 1280, height: 850 };
  if (!value || typeof value !== 'object') return fallback;
  const { x, y, width, height } = value;
  if (![x, y, width, height].every(Number.isFinite) || width < 640 || height < 480 || width > 16384 || height > 16384) return fallback;
  const visible = workAreas.some(a => x < a.x + a.width - 80 && x + width > a.x + 80 && y >= a.y && y < a.y + a.height - 80);
  return visible ? { x, y, width, height, maximized: value.maximized === true } : fallback;
}

module.exports = { HOME, isSite, isTrustedNavigation, isExternalUrl, safeWindowState };
