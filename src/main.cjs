'use strict';

const { app, BrowserWindow, Menu, dialog, shell, session, screen, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { HOME, isSite, isTrustedNavigation, isExternalUrl, safeWindowState } = require('./policy.cjs');
const { CaptionBridge } = require('./caption-bridge.cjs');
const { CaptionCues } = require('./caption-cues.cjs');
const { CaptionTiming } = require('./caption-timing.cjs');
const { captionOptions } = require('./caption-options.cjs');
const { createControlManager } = require('./control-manager.cjs');
const { toggleVideoFullscreen } = require('./video-fullscreen.cjs');
const {createCaptionBufferManager} = require('./caption-buffer-manager.cjs');

app.setName('Spelunkr Desktop');
app.enableSandbox();
if (!app.requestSingleInstanceLock()) { app.quit(); } else {
  let win;
  let failed = false;
  const errorPage = pathToFileURL(path.join(__dirname, 'offline.html')).href;
  const stateFile = () => path.join(app.getPath('userData'), 'window.json');
  const openExternal = url => {
    if (isExternalUrl(url)) shell.openExternal(url).catch(() => {});
  };

  function loadHome() {
    failed = false;
    win.loadURL(HOME).catch(() => {}); // did-fail-load owns the recovery screen.
  }

  function showRecovery() {
    if (!win || win.isDestroyed() || failed) return;
    failed = true;
    win.loadFile(path.join(__dirname, 'offline.html')).catch(() => {});
  }

  function createWindow() {
    let saved;
    try { saved = JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch {}
    const bounds = safeWindowState(saved, screen.getAllDisplays().map(d => d.workArea));
    win = new BrowserWindow({
      ...bounds,
      minWidth: 640,
      minHeight: 480,
      title: 'Spelunkr Desktop — Unofficial',
      backgroundColor: '#1c0a57',
      icon: path.join(__dirname, '../assets/icon.png'),
      show: false,
      webPreferences: {
        partition: 'persist:spelunkr',
        preload: path.join(__dirname, 'preload.generated.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        webviewTag: false,
        navigateOnDragDrop: false
      }
    });
    if (bounds.maximized) win.maximize();
    win.once('ready-to-show', () => win.show());
    // Keep the independent app identity visible on every site page.
    win.on('page-title-updated', event => event.preventDefault());
    win.on('close', () => {
      const boundsToSave = { ...win.getNormalBounds(), maximized: win.isMaximized() };
      try { fs.writeFileSync(stateFile(), JSON.stringify(boundsToSave)); } catch {}
    });

    const contents = win.webContents;
    let videoFullscreen = false;
    const updateFullscreenMenu = () => {
      const item = Menu.getApplicationMenu()?.getMenuItemById('video-fullscreen');
      if (item) item.label = videoFullscreen ? 'Exit video fullscreen (Esc)' : 'Enter video fullscreen';
    };
    contents.on('enter-html-full-screen', () => {videoFullscreen = true;updateFullscreenMenu();});
    contents.on('leave-html-full-screen', () => {videoFullscreen = false;updateFullscreenMenu();});
    contents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape' && !videoFullscreen && win.isFullScreen()) win.setFullScreen(false);
    });
    const nativeRoot = app.isPackaged ? path.join(process.resourcesPath, 'native') : path.join(__dirname, '../native/bin');
    const initialOptions = captionOptions(nativeRoot, process.platform);
    const captions = new CaptionBridge(initialOptions.executable, initialOptions);
    const captionPreferences = path.join(app.getPath('userData'), 'captions.json');
    let captionColor = 'white';
    let captionSize = 1;
    let captionEngine = 'whisper';
    let captionSpeed = 'fast';
    let captionDelayMs = 0;
    let subtitleCooldown = 5;
    let subtitleCoolingDown = false;
    const saveCaptionPreferences = () => {
      try { fs.writeFileSync(captionPreferences, JSON.stringify({color: captionColor, size: captionSize, engine: captionEngine, speed: captionSpeed, delayMs: captionDelayMs, cooldownSeconds: subtitleCooldown})); } catch {}
    };
    const captionSizes = [0.8, 1, 1.25, 1.5, 2];
    try {
      const savedCaptions = JSON.parse(fs.readFileSync(captionPreferences, 'utf8'));
      if (process.platform === 'win32' && savedCaptions.engine === 'windows') captionEngine = 'windows';
      if (savedCaptions.speed === 'balanced') captionSpeed = 'balanced';
      if (savedCaptions.color === 'yellow') captionColor = 'yellow';
      if (captionSizes.includes(savedCaptions.size)) captionSize = savedCaptions.size;
      if (Number.isInteger(savedCaptions.delayMs) && savedCaptions.delayMs >= 0 && savedCaptions.delayMs <= 10000) captionDelayMs = savedCaptions.delayMs;
      if (Number.isInteger(savedCaptions.cooldownSeconds) && savedCaptions.cooldownSeconds >= 0 && savedCaptions.cooldownSeconds <= 30) subtitleCooldown = savedCaptions.cooldownSeconds;
    } catch {}
    let overlayEnabled = false;
    let playbackPaused = false;
    let captureAccepting = false;
    let captionText = '';
    let captionMetadata = { cueId: 0, wordOffset: 0, clearReason: 'reset' };
    let captionStatus = 'Off';
    const sendCaptions = () => {
      if (win && !win.isDestroyed()) contents.send('desktop:captions', {
        enabled: overlayEnabled && isSite(contents.getURL()), color: captionColor, size: captionSize,
        text: isSite(contents.getURL()) ? captionText : '', ...captionMetadata
      });
    };
    const timing = new CaptionTiming({onCue: (text, metadata) => {captionText = text; captionMetadata = metadata; sendCaptions();}});
    timing.setDelay(captionDelayMs);
    const cues = new CaptionCues({ ignoreInitialSnapshot: false, onText: (text, metadata) => timing.receive(text, metadata) });
    const updateCaptionMenu = () => {
      const menu = Menu.getApplicationMenu();
      if (!menu) return;
      const toggle = menu.getMenuItemById('caption-overlay');
      if (toggle) toggle.checked = overlayEnabled;
      // Selecting one radio item unchecks its siblings; only update the active choice.
      const engineChoice = menu.getMenuItemById(`caption-engine-${overlayEnabled ? captionEngine : 'none'}`);
      if (engineChoice) engineChoice.checked = true;
      const status = menu.getMenuItemById('caption-status');
      if (status) status.label = captionStatus;
      const speedMenu = menu.getMenuItemById('caption-speed');
      if (speedMenu) speedMenu.enabled = overlayEnabled && captionEngine === 'whisper';
      const delayMenu = menu.getMenuItemById('caption-delay');
      if (delayMenu) delayMenu.label = `Subtitle delay: ${(captionDelayMs / 1000).toFixed(1)} s`;
      const lessDelay = menu.getMenuItemById('caption-delay-less'), moreDelay = menu.getMenuItemById('caption-delay-more');
      if (lessDelay) lessDelay.enabled = captionDelayMs > 0;
      if (moreDelay) moreDelay.enabled = captionDelayMs < 10000;
      const cooldownMenu = menu.getMenuItemById('subtitle-cooldown');
      if (cooldownMenu) cooldownMenu.label = `Subtitle cooldown: ${subtitleCooldown ? `${subtitleCooldown} s` : 'Off'}`;
      const lessCooldown = menu.getMenuItemById('subtitle-cooldown-less'), moreCooldown = menu.getMenuItemById('subtitle-cooldown-more');
      if (lessCooldown) lessCooldown.enabled = subtitleCooldown > 0;
      if (moreCooldown) moreCooldown.enabled = subtitleCooldown < 30;
      for (const seconds of [0,5,10,15,20,30]) {
        const choice = menu.getMenuItemById(`subtitle-cooldown-${seconds}`);
        if (choice) choice.checked = subtitleCooldown === seconds;
      }
      for (const delay of [0, 500, 1000, 2000, 3000, 5000, 10000]) {
        const item = menu.getMenuItemById(`caption-delay-${delay}`);
        if (item) item.checked = delay === captionDelayMs;
      }
      for (const id of [`caption-speed-${captionSpeed}`, `caption-color-${captionColor}`, `caption-size-${captionSize}`]) {
        const choice = menu.getMenuItemById(id);
        if (choice) choice.checked = true;
      }
    };
    let transition = Promise.resolve();
    let revision = 0;
    const buffered = createCaptionBufferManager({win,ipcMain,nativeRoot,platform:process.platform,
      onCooldown: waiting => {
        subtitleCoolingDown = waiting;
        if (waiting && overlayEnabled) {captionStatus = 'Subtitle cooldown…';updateCaptionMenu();}
        if (!overlayEnabled || captionEngine === 'whisper') return;
        if (!waiting) {setOverlayEnabled(true);return;}
        ++revision;captureAccepting = false;cues.clear({keepSnapshot:false});
        captionStatus = 'Subtitle cooldown…';updateCaptionMenu();sendCaptions();
        transition = transition.then(() => captions.stop());
      },
      onStatus: status => {if (overlayEnabled && captionEngine === 'whisper') {captionStatus = status;updateCaptionMenu();}},
      onFailure: async message => {
        if (!overlayEnabled || captionEngine !== 'whisper') return;
        await setOverlayEnabled(false);
        if (win && !win.isDestroyed()) dialog.showMessageBox(win,{type:'info',title:'Buffered subtitles',message,
          detail:'Subtitles read the channel audio ahead of playback and stay in memory. Try reloading the channel or choosing Faster recognition.'});
      }});
    const setOverlayEnabled = enabled => {
      const request = ++revision;
      const rewindOnEnable = enabled && !overlayEnabled;
      overlayEnabled = enabled;
      if (!enabled) subtitleCoolingDown = false;
      captureAccepting = false;
      cues.clear({ keepSnapshot: false });
      cues.setSpeechActive(captionEngine === 'whisper' ? false : null);
      captionStatus = enabled ? playbackPaused ? 'Paused' : 'Starting captions…' : 'Off';
      buffered.set({enabled:enabled && captionEngine === 'whisper',active:enabled,speed:captionSpeed,delayMs:captionDelayMs,cooldownSeconds:subtitleCooldown,
        rewind:rewindOnEnable,restart:enabled && captionEngine === 'whisper'});
      updateCaptionMenu(); sendCaptions();
      transition = transition.then(async () => {
        await captions.stop();
        if (request !== revision || !overlayEnabled) return;
        if (captionEngine === 'whisper') return;
        if (rewindOnEnable && isSite(contents.getURL())) contents.send('desktop:caption-rewind');
        if (playbackPaused || subtitleCoolingDown) return;
        cues.ignoreInitialSnapshot = captionEngine === 'windows';
        captions.configure(captionOptions(nativeRoot, process.platform, captionEngine, captionSpeed));
        captureAccepting = true;
        captions.start();
      });
      return transition;
    };
    const setCaptionEngine = engine => {
      captionEngine = engine; saveCaptionPreferences();
      setOverlayEnabled(true);
    };
    const setCaptionSpeed = speed => {
      captionSpeed = speed; saveCaptionPreferences(); updateCaptionMenu();
      if (overlayEnabled) setOverlayEnabled(true);
    };
    const setCaptionColor = color => {
      captionColor = color;
      saveCaptionPreferences();
      updateCaptionMenu();
      sendCaptions();
    };
    const setCaptionSize = size => {
      captionSize = size;
      saveCaptionPreferences();
      updateCaptionMenu();
      sendCaptions();
    };
    const setCaptionDelay = milliseconds => {
      captionDelayMs = Math.max(0, Math.min(10000, Math.round(milliseconds / 100) * 100));
      timing.setDelay(captionDelayMs);
      buffered.set({delayMs:captionDelayMs,rewind:false,restart:false});
      saveCaptionPreferences();
      updateCaptionMenu();
    };
    const setSubtitleCooldown = seconds => {
      subtitleCooldown = Math.max(0,Math.min(30,Math.round(seconds)));
      buffered.set({cooldownSeconds:subtitleCooldown,rewind:false,restart:false});
      saveCaptionPreferences();updateCaptionMenu();
    };
    captions.on('caption', (text, source) => { if (overlayEnabled && captureAccepting) cues.update(text, source); });
    captions.on('activity', activity => {
      if (overlayEnabled && captureAccepting && captionEngine === 'whisper' && ['speech','silence'].includes(activity)) cues.setSpeechActive(activity === 'speech');
    });
    captions.on('status', status => { if (overlayEnabled && captureAccepting) { captionStatus = status; updateCaptionMenu(); } });
    captions.on('failure', async message => {
      if (!overlayEnabled || !captureAccepting) return;
      await setOverlayEnabled(false);
      if (win && !win.isDestroyed()) dialog.showMessageBox(win, { type: 'info', title: 'In-app captions', message, detail: 'Whisper captions run locally. Try the Faster recognition setting on an older computer. Windows Live Captions remains an optional Windows 11 engine. See Help for platform setup instructions.' });
    });
    contents.on('did-finish-load', sendCaptions);
    contents.on('did-navigate-in-page', () => {
      if (overlayEnabled && captionEngine === 'whisper') return; // The renderer resets when the actual video source changes.
      else { cues.clear(); sendCaptions(); }
    });
    win.on('closed', () => {
      overlayEnabled=false; revision++; cues.clear({ keepSnapshot: false }); timing.reset(); captions.stop(); win=null;
      if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate([
        {role:'appMenu'}, {label:'File', submenu:[{label:'New Window', accelerator:'Command+N', click:createWindow}]}
      ]));
    });
    contents.on('will-navigate', (event, url) => {
      if (isTrustedNavigation(url)) { failed = false; return; }
      event.preventDefault();
      openExternal(url);
    });
    contents.on('will-redirect', (event, url) => {
      if (isTrustedNavigation(url)) return;
      event.preventDefault();
      showRecovery();
    });
    contents.setWindowOpenHandler(({ url }) => {
      if (isTrustedNavigation(url)) contents.loadURL(url).catch(() => {});
      else openExternal(url);
      return { action: 'deny' };
    });
    contents.on('will-attach-webview', event => event.preventDefault());
    contents.on('did-fail-load', (_event, code, _description, url, isMainFrame) => {
      if (isMainFrame && code !== -3 && url !== errorPage) showRecovery();
    });
    contents.on('render-process-gone', showRecovery);

    const reload = () => failed ? loadHome() : contents.reload();
    const startLiveCaptions = async () => {
      await setOverlayEnabled(false);
      // A fixed OS executable, never a path or command supplied by the website.
      const executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'LiveCaptions.exe');
      const unavailable = () => dialog.showMessageBox(win, {
        type: 'info', title: 'Windows Live Captions',
        message: 'Windows Live Captions could not be opened.',
        detail: 'Live Captions requires Windows 11 version 22H2 or later. You can also open it from Start → Accessibility → Live captions, or press Windows+Ctrl+L. Windows may ask you to download speech files on first use.',
        buttons: ['OK']
      });
      if (process.platform !== 'win32' || !fs.existsSync(executable)) return unavailable();
      // Normal Windows application activation keeps the captions window visible.
      shell.openPath(executable).then(error => {
        if (error && win && !win.isDestroyed()) unavailable();
      }).catch(() => { if (win && !win.isDestroyed()) unavailable(); });
    };
    const back = () => {
      if (failed) loadHome();
      else if (contents.navigationHistory.canGoBack()) contents.navigationHistory.goBack();
    };
    const about = () => dialog.showMessageBox(win, {
      type: 'info', title: 'About Spelunkr Desktop',
      message: `Spelunkr Desktop ${app.getVersion()} — Unofficial`,
      detail: 'An independent desktop app for spelunkr.tv. Not affiliated with or endorsed by Spelunkr or the Internet Archive.\n\nThis app opens the live website. Internet access is required. The site controls channels, playback, and sign-in.\n\nSpelunkr’s name, website, artwork, and programming belong to their respective owners. The app adds no tracking and does not download or host videos.',
      buttons: ['OK']
    });
    const nativeControls = {
      guide: loadHome, reload, back,
      forwardPage: () => {if (contents.navigationHistory.canGoForward()) contents.navigationHistory.goForward();},
      openBrowser: () => openExternal(isSite(contents.getURL()) ? contents.getURL() : HOME),
      fullscreen: () => {
        if (!isSite(contents.getURL())) return;
        if (!videoFullscreen && win.isFullScreen()) win.setFullScreen(false);
        contents.executeJavaScript(`(${toggleVideoFullscreen.toString()})()`, true).catch(() => {});
      },
      alwaysOnTop: () => {
        if (process.platform === 'linux' && process.env.WAYLAND_DISPLAY) return;
        const value = !win.isAlwaysOnTop();win.setAlwaysOnTop(value);
        const item = Menu.getApplicationMenu()?.getMenuItemById('always-on-top');if (item) item.checked = value;
      },
      captions: () => setOverlayEnabled(!overlayEnabled), captionsNone: () => setOverlayEnabled(false),
      captionsWhisper: () => setCaptionEngine('whisper'), captionsWindows: () => {if (process.platform === 'win32') setCaptionEngine('windows');},
      captionLarger: () => setCaptionSize(captionSizes[Math.min(captionSizes.length - 1, captionSizes.indexOf(captionSize) + 1)]),
      captionSmaller: () => setCaptionSize(captionSizes[Math.max(0, captionSizes.indexOf(captionSize) - 1)]),
      captionWhite: () => setCaptionColor('white'), captionYellow: () => setCaptionColor('yellow'),
      captionFaster: () => setCaptionSpeed('fast'), captionBalanced: () => setCaptionSpeed('balanced'),
      captionDelayLess: () => setCaptionDelay(captionDelayMs - 100), captionDelayMore: () => setCaptionDelay(captionDelayMs + 100),
      captionDelayReset: () => setCaptionDelay(0),
      zoomIn: () => contents.setZoomLevel(Math.min(5, contents.getZoomLevel() + .5)),
      zoomOut: () => contents.setZoomLevel(Math.max(-3, contents.getZoomLevel() - .5)), zoomReset: () => contents.setZoomLevel(0)
    };
    const controls = createControlManager({win, BrowserWindow, ipcMain, profileDir: app.getPath('userData'),
      platform: process.platform, actions: nativeControls, io: fs, onPlayback: state => {
        if (captionEngine === 'whisper') return; // Buffered subtitles follow media time, not speaker-capture restarts.
        if (state === 'playing') {
          const wasPaused = playbackPaused;playbackPaused = false;
          if (wasPaused && overlayEnabled) setOverlayEnabled(true);
        } else {
          if (state === 'pause') playbackPaused = true;
          if (overlayEnabled) setOverlayEnabled(true);
          else cues.clear({keepSnapshot: false});
        }
      }});
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{role: 'appMenu'}] : []),
      { label: '&Spelunkr', submenu: [
        { label: 'Channel &guide', click: loadHome },
        { label: '&Open in browser', click: nativeControls.openBrowser },
        { type: 'separator' },
        { label: 'E&xit', visible: process.platform !== 'darwin', accelerator: 'Alt+F4', click: () => app.quit() }
      ] },
      { label: '&Navigate', submenu: [
        { label: '&Back', click: back },
        { label: '&Forward', click: nativeControls.forwardPage },
        { label: '&Reload / Retry connection', click: reload }
      ] },
      { label: '&View', submenu: [
        { id: 'video-fullscreen', label: 'Enter video &fullscreen', click: nativeControls.fullscreen },
        { id: 'always-on-top', label: '&Always on top', enabled: !(process.platform === 'linux' && Boolean(process.env.WAYLAND_DISPLAY)), type: 'checkbox', click: item => win.setAlwaysOnTop(item.checked) },
        { type: 'separator' },
        { label: 'Zoom in', click: nativeControls.zoomIn }, { label: 'Zoom out', click: nativeControls.zoomOut }, { label: 'Reset zoom', click: nativeControls.zoomReset }
      ] },
      { label: '&Captions', submenu: [
        { id: 'caption-overlay', label: '&In-app live captions', type: 'checkbox', click: item => setOverlayEnabled(item.checked) },
        { label: 'Caption engine', submenu: [
          { id: 'caption-engine-none', label: 'None', type: 'radio', checked: !overlayEnabled, click: () => setOverlayEnabled(false) },
          { id: 'caption-engine-whisper', label: 'Built-in captions (Whisper)', type: 'radio', checked: overlayEnabled && captionEngine === 'whisper', click: () => setCaptionEngine('whisper') },
          { id: 'caption-engine-windows', label: 'Windows Live Captions (Windows 11)', visible: process.platform === 'win32', type: 'radio', checked: overlayEnabled && captionEngine === 'windows', click: () => setCaptionEngine('windows') }
        ] },
        { id: 'caption-speed', label: 'Recognition speed', enabled: overlayEnabled && captionEngine === 'whisper', submenu: [
          { id: 'caption-speed-balanced', label: 'Balanced (base English)', type: 'radio', checked: captionSpeed === 'balanced', click: () => setCaptionSpeed('balanced') },
          { id: 'caption-speed-fast', label: 'Faster (tiny English)', type: 'radio', checked: captionSpeed === 'fast', click: () => setCaptionSpeed('fast') }
        ] },
        { label: '&Text color', submenu: [
          { id: 'caption-color-white', label: '&White', type: 'radio', checked: captionColor === 'white', click: () => setCaptionColor('white') },
          { id: 'caption-color-yellow', label: '&Yellow', type: 'radio', checked: captionColor === 'yellow', click: () => setCaptionColor('yellow') }
        ] },
        { label: 'Text &size', submenu: [
          { id: 'caption-size-0.8', label: 'Small (80%)', type: 'radio', checked: captionSize === 0.8, click: () => setCaptionSize(0.8) },
          { id: 'caption-size-1', label: 'Medium (100%)', type: 'radio', checked: captionSize === 1, click: () => setCaptionSize(1) },
          { id: 'caption-size-1.25', label: 'Large (125%)', type: 'radio', checked: captionSize === 1.25, click: () => setCaptionSize(1.25) },
          { id: 'caption-size-1.5', label: 'Extra large (150%)', type: 'radio', checked: captionSize === 1.5, click: () => setCaptionSize(1.5) },
          { id: 'caption-size-2', label: 'Largest (200%)', type: 'radio', checked: captionSize === 2, click: () => setCaptionSize(2) }
        ] },
        { id: 'caption-delay', label: `Subtitle delay: ${(captionDelayMs / 1000).toFixed(1)} s`, submenu: [
          { label: 'Additional time before subtitles appear', enabled: false },
          { id: 'caption-delay-less', label: 'Reduce delay (−0.1 s)', enabled: captionDelayMs > 0, click: nativeControls.captionDelayLess },
          { id: 'caption-delay-more', label: 'Increase delay (+0.1 s)', enabled: captionDelayMs < 10000, click: nativeControls.captionDelayMore },
          { type: 'separator' },
          ...[0, 500, 1000, 2000, 3000, 5000, 10000].map(delay => ({id: `caption-delay-${delay}`,
            label: delay ? `${(delay / 1000).toFixed(1)} seconds` : 'No added delay', type: 'checkbox', checked: captionDelayMs === delay,
            click: () => setCaptionDelay(delay)}))
        ] },
        { id: 'subtitle-cooldown', label: `Subtitle cooldown: ${subtitleCooldown ? `${subtitleCooldown} s` : 'Off'}`, submenu: [
          {label:'Wait after channel changes before loading subtitles',enabled:false},
          {id:'subtitle-cooldown-less',label:'Shorter (−1 s)',enabled:subtitleCooldown > 0,click:() => setSubtitleCooldown(subtitleCooldown-1)},
          {id:'subtitle-cooldown-more',label:'Longer (+1 s)',enabled:subtitleCooldown < 30,click:() => setSubtitleCooldown(subtitleCooldown+1)},
          {type:'separator'},
          ...[0,5,10,15,20,30].map(seconds => ({id:`subtitle-cooldown-${seconds}`,label:seconds ? `${seconds} seconds${seconds === 5 ? ' (default)' : ''}` : 'Off',
            type:'checkbox',checked:subtitleCooldown === seconds,click:() => setSubtitleCooldown(seconds)}))
        ] },
        { id: 'caption-status', label: 'Off', enabled: false },
        { type: 'separator' },
        { label: '&Open Windows caption window', visible: process.platform === 'win32', click: startLiveCaptions },
        { label: 'About Windows captions', visible: process.platform === 'win32', click: () => dialog.showMessageBox(win, {
          title: 'Windows Live Captions', message: 'Captions for whatever is playing.',
          detail: 'Press Ctrl+Shift+L to toggle transparent, text-only captions inside the video. Choose white/yellow and a text size under Captions. Fullscreen captions adapt to the screen width and height.\n\nCaptions clear after roughly 1.5 seconds without new words, with up to 4 seconds of initial reading time for a batch of text. Windows supplies no exact speech-end timings, so pauses are inferred from recognition updates. Old words stay cleared when the next phrase begins.\n\nWindows Live Captions generates the text locally. Its window is minimized while in-app captions run. This optional engine requires Windows 11 22H2 or newer. Choose it under Caption engine. Built-in Whisper captions work on Windows 10 and 11. This captions all PC audio; no audio or transcript is saved. Open Windows caption window remains available as a fallback.'
        }) }
      ] },
      { label: '&Settings', submenu: [{id: 'controls-settings', label: '&Controls…', accelerator: 'CmdOrCtrl+,', click: controls.open}] },
      { label: '&Help', submenu: [
        { label: 'Linux setup and troubleshooting', visible: process.platform === 'linux', click: () => openExternal('https://github.com/printwizardscxcare-design/spelunkr-desktop/blob/main/docs/LINUX.md') },
        { label: 'About Linux captions', visible: process.platform === 'linux', click: () => dialog.showMessageBox(win, { title: 'Linux captions', message: 'Local English captions prepared ahead of playback.', detail: 'Press Ctrl+Shift+L to toggle captions. Whisper reads the channel file directly and prepares timestamped subtitles at least 15 seconds ahead of the picture. Playback pauses while the cache fills. Captions work with the player muted and do not use other apps or a microphone. No audio or transcript is saved. Color, size, subtitle delay, two-line blocks, and fullscreen sizing use the same controls on every platform.' }) },
        { label: 'Mac setup and troubleshooting', visible: process.platform === 'darwin', click: () => openExternal('https://github.com/printwizardscxcare-design/spelunkr-desktop/blob/main/docs/MAC.md') },
        { label: 'About built-in captions', click: () => dialog.showMessageBox(win, { title: 'Whisper captions', message: 'Cached subtitles on Windows, Mac, and Linux.', detail: 'The bundled English Whisper models recognize the channel audio ahead of playback. Turning captions on rewinds 15 seconds once and pauses until at least 15 seconds of subtitles are prepared. Text follows the video timestamps, so pauses and seeks stay aligned. If the cache runs low, playback pauses to refill it. Built-in captions read the channel file directly, work with the player muted, and do not pick up other apps or a microphone. Audio and subtitles stay in memory and are not saved. Use Faster recognition on a slower computer. Words and estimated timings can still be imperfect.' }) },
        { label: '&Keyboard and controller controls', click: controls.open },
        { label: 'Spelunkr &website', click: () => openExternal(HOME) },
        { label: '&Project and updates', click: () => openExternal('https://github.com/printwizardscxcare-design/spelunkr-desktop') },
        { label: '&About this unofficial app', click: about }
      ] }
    ]));
    loadHome();
  }

  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
  });
  app.whenReady().then(() => {
    app.setAppUserModelId('io.github.printwizardscxcare-design.spelunkrdesktop');
    const siteSession = session.fromPartition('persist:spelunkr');
    siteSession.setPermissionRequestHandler((contents, permission, callback, details) => {
      callback(permission === 'fullscreen' && isSite(details.requestingUrl || contents.getURL()));
    });
    siteSession.setPermissionCheckHandler((_contents, permission, origin) => permission === 'fullscreen' && isSite(origin));
    // This is a viewer: pages cannot silently save files to the computer.
    siteSession.on('will-download', event => event.preventDefault());
    createWindow();
  });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
