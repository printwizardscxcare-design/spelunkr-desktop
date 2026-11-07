# Spelunkr Desktop (Unofficial)

An independent, installable Windows app for **[spelunkr.tv](https://spelunkr.tv/)**. It opens the live website in a dedicated window. Channels and website changes arrive directly from Spelunkr without rebuilding the app.

**Not affiliated with or endorsed by Spelunkr or the Internet Archive.** No website assets or video files are bundled. The original app icon belongs to this wrapper, not Spelunkr.

## Install

Download `Spelunkr-Desktop-0.1.1-Windows-x64-Setup.exe` from this repository's Releases and run it. The installer is for the current user, does not require administrator access, and offers an installation folder plus Start menu and desktop shortcuts. Remove it through Windows Settings → Apps → Installed apps. Viewing preferences are retained on uninstall.

Requires Windows 10/11 x64 and an internet connection. This first build is unsigned, so Windows may show an unknown-publisher or SmartScreen warning. No automatic updater is included; use this private repository's Releases for new builds. Never install a copy from an unknown source.

## Controls

| Control | Action |
| --- | --- |
| F11 | Toggle app fullscreen |
| **↑ / ↓ while fullscreen** | **Next / previous channel**, in both app and website video fullscreen |
| Ctrl+Shift+L | Start **Windows Live Captions** |
| Ctrl+Shift+T | Toggle always on top |
| Ctrl+Home | Return to channel guide |
| Ctrl+R or F5 | Reload / retry connection |
| Alt+← / → | Back / forward |
| Ctrl+Plus / Minus / 0 | Zoom in / out / reset |
| Ctrl+Shift+O | Open current Spelunkr page in your browser |

The app menu has the same controls, including **Captions → Start Windows Live Captions**. Press Alt to access the menu. Arrow overrides leave text fields, sliders, subtitle menus, and dialogs alone. Holding an arrow does not repeatedly skip channels. The site's normal shortcuts remain available outside fullscreen.

### Windows native captions

The Captions command starts Windows' built-in Live Captions application using the fixed system executable. Requires **Windows 11 22H2 or later**; it is unavailable on Windows 10. Windows controls the caption overlay and may prompt for a first-time speech-file download. Complete that setup yourself. Use the Windows caption bar to pick a language, change its position, or close it. The command starts the service; it does not toggle it off.

Live Captions captions all PC audio, including this app, using Windows' on-device speech recognition. It is separate from existing subtitle tracks on the website's CC control. The wrapper does not record audio, request microphone permission, or send audio to a transcription service. See [Microsoft's Live Captions guide](https://support.microsoft.com/en-us/accessibility/windows/use-live-captions-to-better-understand-audio).

## Privacy and boundaries

- Local persistent browser storage keeps the website's preferences and any sign-in session. Window size and position are stored locally.
- The wrapper adds no analytics. The live site's own [privacy information](https://spelunkr.tv/about) applies to its requests.
- Remote pages run with Node integration disabled, context isolation, and Chromium sandboxing. No desktop APIs are exposed to the website. The fullscreen adapter receives a boolean from the app and dispatches the site's existing TV remote channel events.
- Only the exact Spelunkr origin and its pinned Discord/Supabase authentication endpoints can navigate within the app. Other HTTPS links open in your default browser. Other URL schemes and file downloads are blocked.
- Sign-in and casting depend on upstream browser compatibility. Discord login is optional and not required to watch. Casting is best performed in Chrome using Open in browser; this app does not promise Chromecast support.
- There is no offline video mode. A recovery page provides Retry when the site fails to load.

## Build

On Windows, install Node.js 24 or later, then:

```powershell
npm ci
npm test
npm run dist -- --publish never
```

The installer is written to `dist/`. `npm start` runs the app locally; `npm run pack` creates an unpacked app for testing. Original icons are checked in; regenerate with `powershell -File scripts/make-icon.ps1` if needed. Dependencies and runtime versions are pinned in `package-lock.json`.

The Windows GitHub Actions workflow builds an installer and checksum on manual dispatch or version-tag pushes. It does not publish anything publicly.

## Existing app research

Checked November 6, 2026: Spelunkr's [official app page](https://spelunkr.tv/app) lists Android, Android TV/Google TV, and Fire TV builds. An [independent LG webOS client](https://github.com/Nikolay1243/spelunkr-webos) also exists. No standalone Windows download was found in the official pages, GitHub searches, or Microsoft Store search. This is a bounded search, not a claim that no private or unindexed app exists.

The site also supplies a web-app manifest. You can already install it through Microsoft Edge's **More tools → Apps → Install this site as an app**. This repository provides the separately packaged Windows installer, fullscreen channel arrows, and native Live Captions command requested by its owner.

## License

MIT for this wrapper and its original icon only. Spelunkr's name, website, styling, programming, and third-party videos remain the property of their respective owners.
