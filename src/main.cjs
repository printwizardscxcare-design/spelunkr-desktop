'use strict';

const { app, BrowserWindow, Menu, dialog, shell, session, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { HOME, isSite, isTrustedNavigation, isExternalUrl, safeWindowState } = require('./policy.cjs');
const { CaptionBridge } = require('./caption-bridge.cjs');
const { CaptionCues } = require('./caption-cues.cjs');

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
        preload: path.join(__dirname, 'preload.cjs'),
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
    const captions = new CaptionBridge(app.isPackaged
      ? path.join(process.resourcesPath, 'native/CaptionReader.exe')
      : path.join(__dirname, '../native/bin/CaptionReader.exe'));
    const captionPreferences = path.join(app.getPath('userData'), 'captions.json');
    let captionColor = 'white';
    let captionSize = 1;
    const captionSizes = [0.8, 1, 1.25, 1.5, 2];
    try {
      const savedCaptions = JSON.parse(fs.readFileSync(captionPreferences, 'utf8'));
      if (savedCaptions.color === 'yellow') captionColor = 'yellow';
      if (captionSizes.includes(savedCaptions.size)) captionSize = savedCaptions.size;
    } catch {}
    let overlayEnabled = false;
    let captionText = '';
    let captionStatus = 'Off';
    const sendCaptions = () => {
      if (win && !win.isDestroyed()) contents.send('desktop:captions', {
        enabled: overlayEnabled && isSite(contents.getURL()), color: captionColor, size: captionSize,
        text: isSite(contents.getURL()) ? captionText : ''
      });
    };
    const cues = new CaptionCues({ onText: text => { captionText = text; sendCaptions(); } });
    const updateCaptionMenu = () => {
      const menu = Menu.getApplicationMenu();
      if (!menu) return;
      const toggle = menu.getMenuItemById('caption-overlay');
      if (toggle) toggle.checked = overlayEnabled;
      const status = menu.getMenuItemById('caption-status');
      if (status) status.label = captionStatus;
    };
    const setOverlayEnabled = async enabled => {
      overlayEnabled = enabled;
      cues.clear({ keepSnapshot: false });
      captionStatus = enabled ? 'Connecting to Windows captions…' : 'Off';
      updateCaptionMenu();
      sendCaptions();
      if (enabled) captions.start();
      else await captions.stop();
    };
    const setCaptionColor = color => {
      captionColor = color;
      try { fs.writeFileSync(captionPreferences, JSON.stringify({ color, size: captionSize })); } catch {}
      sendCaptions();
    };
    const setCaptionSize = size => {
      captionSize = size;
      try { fs.writeFileSync(captionPreferences, JSON.stringify({ color: captionColor, size })); } catch {}
      sendCaptions();
    };
    captions.on('caption', text => { if (overlayEnabled) cues.update(text); });
    captions.on('status', status => { captionStatus = status; updateCaptionMenu(); });
    captions.on('failure', async message => {
      await setOverlayEnabled(false);
      if (win && !win.isDestroyed()) dialog.showMessageBox(win, { type: 'info', title: 'In-app captions', message, detail: 'The Windows captions window is still available from Captions → Open Windows caption window.' });
    });
    contents.on('did-finish-load', sendCaptions);
    contents.on('did-navigate-in-page', () => { cues.clear(); sendCaptions(); });
    win.on('closed', () => { cues.clear({ keepSnapshot: false }); captions.stop(); });
    const sendFullscreenState = () => contents.send('desktop:fullscreen', win.isFullScreen());
    win.on('enter-full-screen', sendFullscreenState);
    win.on('leave-full-screen', sendFullscreenState);
    contents.on('did-finish-load', sendFullscreenState);
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
      detail: 'An independent Windows app for spelunkr.tv. Not affiliated with or endorsed by Spelunkr or the Internet Archive.\n\nThis app opens the live website. Internet access is required. The site controls channels, playback, and sign-in.\n\nSpelunkr’s name, website, artwork, and programming belong to their respective owners. The app adds no tracking and does not download or host videos.',
      buttons: ['OK']
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: '&Spelunkr', submenu: [
        { label: 'Channel &guide', accelerator: 'CmdOrCtrl+Home', click: loadHome },
        { label: '&Open in browser', accelerator: 'CmdOrCtrl+Shift+O', click: () => openExternal(isSite(contents.getURL()) ? contents.getURL() : HOME) },
        { type: 'separator' },
        { label: 'E&xit', accelerator: 'Alt+F4', click: () => app.quit() }
      ] },
      { label: '&Navigate', submenu: [
        { label: '&Back', accelerator: 'Alt+Left', click: back },
        { label: '&Forward', accelerator: 'Alt+Right', click: () => { if (contents.navigationHistory.canGoForward()) contents.navigationHistory.goForward(); } },
        { label: '&Reload / Retry connection', accelerator: 'CmdOrCtrl+R', click: reload },
        { label: 'Reload', accelerator: 'F5', visible: false, click: reload }
      ] },
      { label: '&View', submenu: [
        { label: '&Fullscreen', accelerator: 'F11', click: () => win.setFullScreen(!win.isFullScreen()) },
        { label: '&Always on top', accelerator: 'CmdOrCtrl+Shift+T', type: 'checkbox', click: item => win.setAlwaysOnTop(item.checked) },
        { type: 'separator' },
        { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }
      ] },
      { label: '&Captions', submenu: [
        { id: 'caption-overlay', label: '&In-app live captions', type: 'checkbox', accelerator: 'CmdOrCtrl+Shift+L', click: item => setOverlayEnabled(item.checked) },
        { label: '&Text color', submenu: [
          { label: '&White', type: 'radio', checked: captionColor === 'white', click: () => setCaptionColor('white') },
          { label: '&Yellow', type: 'radio', checked: captionColor === 'yellow', click: () => setCaptionColor('yellow') }
        ] },
        { label: 'Text &size', submenu: [
          { label: 'Small (80%)', type: 'radio', checked: captionSize === 0.8, click: () => setCaptionSize(0.8) },
          { label: 'Medium (100%)', type: 'radio', checked: captionSize === 1, click: () => setCaptionSize(1) },
          { label: 'Large (125%)', type: 'radio', checked: captionSize === 1.25, click: () => setCaptionSize(1.25) },
          { label: 'Extra large (150%)', type: 'radio', checked: captionSize === 1.5, click: () => setCaptionSize(1.5) },
          { label: 'Largest (200%)', type: 'radio', checked: captionSize === 2, click: () => setCaptionSize(2) }
        ] },
        { id: 'caption-status', label: 'Off', enabled: false },
        { type: 'separator' },
        { label: '&Open Windows caption window', click: startLiveCaptions },
        { label: 'About Windows captions', click: () => dialog.showMessageBox(win, {
          title: 'Windows Live Captions', message: 'Captions for whatever is playing.',
          detail: 'Press Ctrl+Shift+L to toggle transparent, text-only captions inside the video. Choose white/yellow and a text size under Captions. Fullscreen captions adapt to the screen width and height.\n\nCaptions clear after roughly 1.5 seconds without new words, with up to 4 seconds of initial reading time for a batch of text. Windows supplies no exact speech-end timings, so pauses are inferred from recognition updates. Old words stay cleared when the next phrase begins.\n\nWindows Live Captions generates the text locally. Its window is minimized while in-app captions run. Requires Windows 11 22H2 or newer. This captions all PC audio; no audio or transcript is saved. Open Windows caption window remains available as a fallback.'
        }) }
      ] },
      { label: '&Help', submenu: [
        { label: '&Keyboard shortcuts', click: () => dialog.showMessageBox(win, { title: 'Keyboard shortcuts', message: 'Your TV, on your desktop.', detail: 'F11 — Toggle fullscreen\nUp / Down in fullscreen — Next / Previous channel\nCtrl+Shift+L — Toggle in-app live captions\nCtrl+Shift+T — Always on top\nCtrl+Home — Channel guide\nCtrl+R or F5 — Reload / Retry\nAlt+Left / Right — Back / Forward\nCtrl+Plus / Minus / 0 — Zoom\nCtrl+Shift+O — Open in browser\n\nThe website’s own player shortcuts also work. Press Alt to access the app menu.' }) },
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
  app.on('window-all-closed', () => app.quit());
}
