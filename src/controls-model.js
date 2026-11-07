(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ControlsModel = factory();
})(globalThis, function () {
  'use strict';
  const ACTIONS = [
    ['channelNext', 'Next channel', 'Channels'], ['channelPrevious', 'Previous channel', 'Channels'],
    ['randomChannel', 'Random channel', 'Channels'], ['guide', 'Channel guide', 'Channels', true],
    ['watch', 'Watch view', 'Channels'], ['channelDetails', 'Channel details', 'Channels'],
    ['volumeUp', 'Volume up', 'Playback', false, true], ['volumeDown', 'Volume down', 'Playback', false, true],
    ['mute', 'Mute / unmute', 'Playback'], ['playPause', 'Play / pause', 'Playback'],
    ['rewind', 'Rewind 15 seconds', 'Playback', false, true], ['forward', 'Forward 15 seconds', 'Playback', false, true],
    ['live', 'Return to live', 'Playback'], ['fullscreen', 'Fullscreen on / off', 'Playback', true],
    ['pictureInPicture', 'Float the video', 'Playback'], ['hideComments', 'Show / hide comments', 'Playback'],
    ['comment', 'Open comment box', 'Page'], ['reactions', 'Open reactions', 'Page'],
    ['captions', 'Captions on / off', 'Captions', true], ['captionsNone', 'Turn captions off', 'Captions', true],
    ['captionsWhisper', 'Use Whisper captions', 'Captions', true], ['captionsWindows', 'Use Windows captions', 'Captions', true],
    ['captionLarger', 'Larger subtitles', 'Captions', true], ['captionSmaller', 'Smaller subtitles', 'Captions', true],
    ['captionWhite', 'White subtitles', 'Captions', true], ['captionYellow', 'Yellow subtitles', 'Captions', true],
    ['captionFaster', 'Faster recognition', 'Captions', true], ['captionBalanced', 'Balanced recognition', 'Captions', true],
    ['captionDelayLess', 'Reduce subtitle delay (0.1 s)', 'Captions', true, true],
    ['captionDelayMore', 'Increase subtitle delay (0.1 s)', 'Captions', true, true],
    ['captionDelayReset', 'Reset subtitle delay', 'Captions', true],
    ['alwaysOnTop', 'Always on top', 'Window', true], ['zoomIn', 'Zoom in', 'Window', true, true],
    ['zoomOut', 'Zoom out', 'Window', true, true], ['zoomReset', 'Reset zoom', 'Window', true],
    ['reload', 'Reload / retry', 'App', true], ['back', 'Go back', 'App', true],
    ['forwardPage', 'Go forward', 'App', true], ['openBrowser', 'Open in browser', 'App', true]
  ].map(([id, label, group, native = false, repeat = false]) => ({id, label, group, native, repeat}));
  const ACTION_IDS = new Set(ACTIONS.map(a => a.id));
  const MODIFIER_CODES = new Set(['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);
  const key = (code, modifiers = {}) => ({type: 'key', code, ctrl: false, alt: false, shift: false, meta: false, ...modifiers});
  const pad = button => ({type: 'gamepad', kind: 'button', index: button, standardOnly: true});

  function defaults(platform = 'win32') {
    const command = platform === 'darwin' ? {meta: true} : {ctrl: true};
    const bindings = Object.fromEntries(ACTIONS.map(a => [a.id, {keyboard: null, gamepad: null}]));
    const keys = {
      channelNext: key('ArrowUp'), channelPrevious: key('ArrowDown'),
      volumeUp: key('ArrowRight'), volumeDown: key('ArrowLeft'),
      randomChannel: key('KeyR'), playPause: key('Space'), mute: key('KeyM'),
      rewind: key('ArrowLeft', {shift: true}), forward: key('ArrowRight', {shift: true}),
      guide: key('Home', command), captions: key('KeyL', {...command, shift: true}),
      fullscreen: platform === 'darwin' ? key('KeyF', {ctrl: true, meta: true}) : key('F11'),
      alwaysOnTop: key('KeyT', {...command, shift: true}), reload: key('KeyR', command),
      back: key('ArrowLeft', {alt: true}), forwardPage: key('ArrowRight', {alt: true}),
      openBrowser: key('KeyO', {...command, shift: true}),
      zoomIn: key('Equal', command), zoomOut: key('Minus', command), zoomReset: key('Digit0', command)
    };
    const pads = {channelNext: pad(12), channelPrevious: pad(13), volumeDown: pad(14), volumeUp: pad(15),
      playPause: pad(0), back: pad(1), captions: pad(2), fullscreen: pad(3), guide: pad(9)};
    for (const [id, binding] of Object.entries(keys)) bindings[id].keyboard = binding;
    for (const [id, binding] of Object.entries(pads)) bindings[id].gamepad = binding;
    return {version: 1, bindings, pageActions: []};
  }

  function normalizeKey(value) {
    let code = value?.code;
    if (!code || code === 'Unidentified') {
      const character = value?.key;
      code = character === ' ' ? 'Space' : /^[a-z]$/i.test(character || '') ? 'Key' + character.toUpperCase() :
        /^\d$/.test(character || '') ? 'Digit' + character : character;
    }
    if (typeof code !== 'string' || !/^[A-Za-z][A-Za-z0-9]{0,31}$/.test(code) || MODIFIER_CODES.has(code)) return null;
    const result = key(code, {ctrl: value.ctrl === true || value.ctrlKey === true, alt: value.alt === true || value.altKey === true,
      shift: value.shift === true || value.shiftKey === true, meta: value.meta === true || value.metaKey === true});
    return result;
  }
  function normalizeBinding(value, platform = 'win32') {
    if (value === null || value === undefined) return null;
    if (value.type === 'key') {
      const result = normalizeKey(value);
      if (!result) throw Error('Press a key together with any modifiers you want.');
      if (result.code === 'Escape' || (result.alt && ['F4', 'Tab'].includes(result.code)) || (result.ctrl && result.alt && result.code === 'Delete') ||
        (platform === 'darwin' && result.meta && result.code === 'KeyQ') ||
        (platform !== 'darwin' && result.meta) ||
        (result.code === 'Comma' && (platform === 'darwin' ? result.meta : result.ctrl))) {
        throw Error('That shortcut is reserved by the app or your computer. Choose another key.');
      }
      return result;
    }
    if (value.type === 'gamepad' && ['button', 'axis'].includes(value.kind) && Number.isInteger(value.index) &&
      value.index >= 0 && value.index < (value.kind === 'button' ? 256 : 32)) {
      const result = {type: 'gamepad', kind: value.kind, index: value.index, standardOnly: value.standardOnly === true};
      if (value.kind === 'axis') {
        if (![1, -1].includes(value.direction)) throw Error('Choose one direction of the stick.');
        result.direction = value.direction;
      }
      if (typeof value.deviceId === 'string' && value.deviceId.length <= 300) result.deviceId = value.deviceId;
      return result;
    }
    throw Error('This control assignment is not supported.');
  }
  function signature(binding) {
    if (!binding) return '';
    if (binding.type === 'key') return ['key', binding.code, +binding.ctrl, +binding.alt, +binding.shift, +binding.meta].join(':');
    return ['gamepad', binding.kind, binding.index, binding.direction || 0, binding.deviceId || '', +binding.standardOnly].join(':');
  }
  function label(binding, platform = 'win32') {
    if (!binding) return 'Not assigned';
    if (binding.type === 'key') {
      const names = {ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Equal: '+', Minus: '−',
        Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Backquote: '`'};
      const name = names[binding.code] || binding.code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Numpad ');
      return [binding.ctrl && 'Ctrl', binding.alt && (platform === 'darwin' ? 'Option' : 'Alt'), binding.shift && 'Shift', binding.meta && 'Command', name].filter(Boolean).join('+');
    }
    if (binding.kind === 'axis') {
      if (binding.standardOnly && binding.index < 4) return `${binding.index < 2 ? 'Left' : 'Right'} stick ${binding.index % 2 ? (binding.direction < 0 ? 'up' : 'down') : (binding.direction < 0 ? 'left' : 'right')}`;
      return `Stick axis ${binding.index + 1} ${binding.direction < 0 ? '−' : '+'}`;
    }
    const names = ['Bottom face button', 'Right face button', 'Left face button', 'Top face button', 'Left shoulder', 'Right shoulder',
      'Left trigger', 'Right trigger', 'Back / Select', 'Start / Menu', 'Left stick press', 'Right stick press', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Home button'];
    return binding.standardOnly && names[binding.index] ? names[binding.index] : `Controller button ${binding.index + 1}`;
  }
  function pageId(match) {
    const identity = JSON.stringify([match.tag, match.id || '', match.href || '', match.id || match.href ? '' : match.label]);
    let hash = 2166136261;
    for (let i = 0; i < identity.length; i++) hash = Math.imul(hash ^ identity.charCodeAt(i), 16777619) >>> 0;
    return 'page:' + hash.toString(16);
  }
  function pageAction(value) {
    if (!value || typeof value.label !== 'string' || !value.label.trim() || value.label.length > 180) return null;
    const m = value.match;
    if (!m || !['BUTTON', 'A', 'INPUT'].includes(m.tag)) return null;
    const match = {tag: m.tag, label: String(m.label || '').slice(0,180)};
    if (typeof m.id === 'string' && m.id.length <= 200) match.id = m.id;
    if (typeof m.href === 'string' && m.href.length <= 1000) {
      try { const url = new URL(m.href); if (url.protocol !== 'https:' || url.username || url.password) return null; match.href = url.href; } catch {return null;}
    }
    if (!match.id && !match.href && !match.label) return null;
    return {id: pageId(match), label: value.label.trim(), group: 'Other page controls', match, native: false, repeat: false};
  }
  function mergePages(...lists) {
    const result = new Map();
    for (const value of lists.flat()) {
      const action = pageAction(value);
      if (action) result.set(action.id, action);
      if (result.size >= 256) break;
    }
    return [...result.values()];
  }
  function actions(platform = 'win32', pages = []) {
    return [...ACTIONS.filter(a => a.id !== 'captionsWindows' || platform === 'win32'), ...mergePages(pages)];
  }
  function config(raw, platform = 'win32', pages = raw?.pageActions || []) {
    const base = defaults(platform);
    const pageActions = mergePages(pages);
    const known = new Set([...ACTION_IDS, ...pageActions.map(a => a.id)]);
    if (raw && (raw.version !== 1 || !raw.bindings || typeof raw.bindings !== 'object' || Array.isArray(raw.bindings))) throw Error('Invalid controls settings.');
    if (raw && Object.keys(raw.bindings).some(id => !known.has(id))) throw Error('An assigned action is no longer available.');
    const bindings = {};
    const used = new Map();
    for (const id of known) {
      const source = raw && Object.hasOwn(raw.bindings, id) ? raw.bindings[id] : base.bindings[id] || {};
      if (!source || typeof source !== 'object') throw Error('Invalid control assignment.');
      const value = {keyboard: normalizeBinding(source.keyboard, platform), gamepad: normalizeBinding(source.gamepad, platform)};
      if (value.keyboard && value.keyboard.type !== 'key' || value.gamepad && value.gamepad.type !== 'gamepad') throw Error('Invalid input type.');
      for (const binding of Object.values(value)) {
        const key = signature(binding);
        if (key && used.has(key)) throw Error('The same input is assigned to more than one action.');
        if (key) used.set(key, id);
      }
      bindings[id] = value;
    }
    return {version: 1, bindings, pageActions};
  }
  function assign(bindings, actionId, binding) {
    const updated = JSON.parse(JSON.stringify(bindings));
    const slot = binding.type === 'key' ? 'keyboard' : 'gamepad';
    const moved = [];
    for (const [id, value] of Object.entries(updated)) {
      if (id !== actionId && signature(value[slot]) === signature(binding)) {value[slot] = null; moved.push(id);}
    }
    updated[actionId] ||= {keyboard: null, gamepad: null};
    updated[actionId][slot] = binding;
    return {bindings: updated, moved};
  }
  function keyAction(event, current) {
    const binding = normalizeKey(event);
    if (!binding) return null;
    const key = signature(binding);
    return Object.entries(current.bindings).find(([, value]) => signature(value.keyboard) === key)?.[0] || null;
  }
  class GamepadTracker {
    constructor() {this.previous = new Map(); this.primed = false;}
    reset() {this.previous.clear(); this.primed = false;}
    sample(pads, now = Date.now()) {
      const current = new Map(), events = [];
      for (const controller of Array.from(pads || []).filter(Boolean)) {
        if (controller.connected === false) continue;
        const base = {type: 'gamepad', standardOnly: controller.mapping === 'standard', ...(controller.mapping === 'standard' ? {} : {deviceId: String(controller.id).slice(0,300)})};
        const active = [];
        Array.from(controller.buttons || []).slice(0,256).forEach((button, index) => {
          if (button.pressed || button.value >= .65) active.push({...base, kind: 'button', index});
        });
        Array.from(controller.axes || []).slice(0,32).forEach((axis, index) => {
          for (const direction of [-1, 1]) {
            const old = this.previous.has(`${controller.index}:axis:${index}:${direction}`);
            if (axis * direction >= (old ? .35 : .7)) active.push({...base, kind: 'axis', index, direction});
          }
        });
        for (const binding of active) {
          const id = `${controller.index}:${binding.kind}:${binding.index}:${binding.direction || 0}`;
          const previous = this.previous.get(id);
          const next = previous || {repeatAt: now + 400};
          if (this.primed && !previous) events.push({binding, controller, repeat: false});
          else if (this.primed && previous && now >= previous.repeatAt) {events.push({binding, controller, repeat: true});next.repeatAt = now + 120;}
          current.set(id, next);
        }
      }
      this.previous = current; this.primed = true;
      return events;
    }
  }
  function gamepadAction(event, current) {
    return Object.entries(current.bindings).find(([, value]) => {
      const b = value.gamepad;
      return b && b.kind === event.binding.kind && b.index === event.binding.index &&
        (b.kind !== 'axis' || b.direction === event.binding.direction) &&
        (!b.standardOnly || event.controller.mapping === 'standard') && (!b.deviceId || b.deviceId === event.controller.id);
    })?.[0] || null;
  }
  return {ACTIONS, defaults, normalizeKey, normalizeBinding, signature, label, pageAction, pageId, mergePages, actions, config, assign, keyAction, gamepadAction, GamepadTracker};
});
