'use strict';
(async function () {
  const model = window.ControlsModel, api = window.controlsSettings;
  const list = document.getElementById('list'), saveButton = document.getElementById('save');
  const status = document.getElementById('status'), capture = document.getElementById('capture');
  let snapshot, draft, original, listening = null, previousFocus = null, saving = false;
  const tracker = new model.GamepadTracker();
  function say(message, error = false) {status.textContent = message;status.classList.toggle('error', error);}
  function dirty() {return JSON.stringify(draft) !== original;}
  function updateSave() {saveButton.disabled = saving || listening !== null || !dirty();}
  function stopCapture() {listening = null;capture.hidden = true;updateSave();previousFocus?.focus();}
  function begin(id) {
    listening = id;previousFocus = document.activeElement;
    document.getElementById('capture-title').textContent = snapshot.actions.find(action => action.id === id).label;
    document.getElementById('capture-instruction').textContent = 'Press a keyboard key, controller button, trigger, or stick direction.';
    capture.hidden = false;document.getElementById('cancel-capture').focus();updateSave();
  }
  function accept(raw) {
    try {
      const binding = model.normalizeBinding(raw, snapshot.platform);
      if (!binding) return;
      const action = snapshot.actions.find(action => action.id === listening);
      const result = model.assign(draft, listening, binding);
      draft = result.bindings;stopCapture();render();
      const moved = result.moved.map(id => snapshot.actions.find(action => action.id === id)?.label).filter(Boolean);
      say(`${model.label(binding, snapshot.platform)} → ${action.label}.${moved.length ? ' Removed from ' + moved.join(', ') + '.' : ''} Save to apply.`);
    } catch (error) {document.getElementById('capture-instruction').textContent = error.message;}
  }
  function render() {
    list.replaceChildren();
    let group = '';
    for (const action of snapshot.actions) {
      if (group !== action.group) {group = action.group;const heading = document.createElement('h2');heading.className = 'group';heading.textContent = group;list.append(heading);}
      const row = document.createElement('div');row.className = 'row';row.dataset.action = action.id;
      const name = document.createElement('div');name.className = 'action-name';name.textContent = action.label;
      const bindings = document.createElement('div');bindings.className = 'bindings';
      const value = draft[action.id] || {keyboard: null, gamepad: null};
      for (const slot of ['keyboard','gamepad']) {
        if (!value[slot]) continue;
        const chip = document.createElement('span');chip.className = 'binding';
        const type = document.createElement('span');type.className = 'binding-label';type.textContent = slot === 'keyboard' ? 'KEY' : 'PAD';
        const text = document.createElement('span');text.textContent = model.label(value[slot], snapshot.platform);
        const clear = document.createElement('button');clear.type = 'button';clear.textContent = '×';clear.title = `Clear ${slot} assignment for ${action.label}`;clear.setAttribute('aria-label',clear.title);
        clear.addEventListener('click', () => {draft[action.id][slot] = null;render();say('Assignment cleared. Save to apply.');});
        chip.append(type,text,clear);bindings.append(chip);
      }
      if (!bindings.childNodes.length) {const empty = document.createElement('span');empty.className = 'unassigned';empty.textContent = 'Not assigned';bindings.append(empty);}
      const assign = document.createElement('button');assign.type = 'button';assign.className = 'assign';assign.textContent = 'Assign';assign.setAttribute('aria-label', `Assign ${action.label}`);assign.addEventListener('click', () => begin(action.id));
      row.append(name,bindings,assign);list.append(row);
    }
    updateSave();
  }
  async function save() {
    if (!dirty() || saving || listening !== null) return;
    saving = true;updateSave();say('Saving…');
    try {
      const result = await api.save({version: 1, bindings: draft});
      if (result.ok) api.close();
      else {saving = false;say(result.error, true);updateSave();}
    } catch {saving = false;say('Your controls could not be saved. Try again.',true);updateSave();}
  }
  let pendingSnapshot;
  api.onCatalog(next => {
    if (!snapshot) {pendingSnapshot = next;return;}
    const wasDirty = dirty();
    for (const [id, value] of Object.entries(next.config.bindings)) if (!Object.hasOwn(draft,id)) draft[id] = structuredClone(value);
    snapshot = next;
    if (!wasDirty) original = JSON.stringify(draft);
    render();
  });
  snapshot = await api.load();
  if (pendingSnapshot) snapshot = pendingSnapshot;
  draft = structuredClone(snapshot.config.bindings);original = JSON.stringify(draft);
  document.getElementById('cancel-capture').addEventListener('click',stopCapture);
  document.getElementById('cancel').addEventListener('click',() => api.close());
  document.getElementById('save').addEventListener('click',save);
  document.getElementById('reset').addEventListener('click',() => {
    draft = model.defaults(snapshot.platform).bindings;
    for (const action of snapshot.actions) draft[action.id] ||= {keyboard: null, gamepad: null};
    render();say('Defaults restored in this draft. Save to apply.');
  });
  document.addEventListener('keydown',event => {
    if (listening !== null) {
      event.preventDefault();event.stopImmediatePropagation();
      if (event.repeat) return;
      const binding = model.normalizeKey(event);
      if (binding) accept(binding);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {event.preventDefault();save();}
    else if (event.code === 'Escape') {event.preventDefault();api.close();}
  },true);
  function poll() {
    try {
      const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
      document.getElementById('controllers').textContent = pads.length ? `${pads.length} controller${pads.length === 1 ? '' : 's'} detected` : 'Connect a controller and press a button to detect it.';
      if (!document.hasFocus()) tracker.reset();
      else for (const event of tracker.sample(pads)) if (listening !== null && !event.repeat) {accept(event.binding);break;}
    } catch {tracker.reset();}
    requestAnimationFrame(poll);
  }
  render();say('Assign controls, then save your changes.');requestAnimationFrame(poll);
})().catch(() => {document.getElementById('status').textContent = 'Controls settings could not load. Close this window and try again.';});
