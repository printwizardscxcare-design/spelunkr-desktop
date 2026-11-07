'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isSite, isTrustedNavigation, isExternalUrl, safeWindowState } = require('../src/policy.cjs');

test('only the exact HTTPS website is treated as Spelunkr', () => {
  assert.ok(isSite('https://spelunkr.tv/channel/test'));
  for (const url of ['http://spelunkr.tv/', 'https://spelunkr.tv.evil.example/', 'https://spelunkr.tv:444/', 'https://evil.example/?next=https://spelunkr.tv', 'https://name@spelunkr.tv/', 'javascript:alert(1)', 'file:///C:/Windows/win.ini', 'invalid']) assert.equal(isSite(url), false, url);
});
test('only pinned auth endpoints may navigate inside the app', () => {
  assert.ok(isTrustedNavigation('https://discord.com/oauth2/authorize?client_id=123'));
  assert.ok(isTrustedNavigation('https://discord.com/login'));
  assert.ok(isTrustedNavigation('https://jbuopkuluyfjwgsrigry.supabase.co/auth/v1/callback?code=abc'));
  for (const url of ['https://discord.com/channels/foo', 'https://discord.com/login-evil', 'https://discord.com.evil.example/login', 'https://other.supabase.co/auth/v1/callback', 'https://jbuopkuluyfjwgsrigry.supabase.co/storage/foo']) assert.equal(isTrustedNavigation(url), false, url);
});
test('external links cannot launch local files or arbitrary application protocols', () => {
  assert.ok(isExternalUrl('https://archive.org/details/example'));
  for (const url of ['javascript:alert(1)', 'file:///C:/test.exe', 'ms-settings:', 'shell:AppsFolder', 'http://example.com', 'https://user:password@example.com', 'invalid']) assert.equal(isExternalUrl(url), false, url);
});
test('window state recovers from removed monitors and malformed settings', () => {
  const monitors = [{ x: 0, y: 0, width: 1920, height: 1080 }];
  const good = { x: 100, y: 80, width: 1000, height: 700, maximized: true };
  assert.deepEqual(safeWindowState(good, monitors), good);
  for (const bad of [null, {}, { ...good, x: 8000 }, { ...good, y: -500 }, { ...good, width: -1 }, { ...good, width: '900' }]) assert.deepEqual(safeWindowState(bad, monitors), { width: 1280, height: 850 });
});
