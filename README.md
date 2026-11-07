# Spelunkr Desktop (Unofficial)

An independent, installable Windows app for **[spelunkr.tv](https://spelunkr.tv/)**. It opens the live website in a dedicated window. Channels and website changes arrive directly from Spelunkr without rebuilding the app.

**Not affiliated with or endorsed by Spelunkr or the Internet Archive.** No website assets or video files are bundled. The original app icon belongs to this wrapper, not Spelunkr.

## Install

Download `Spelunkr-Desktop-0.4.0-Windows-x64-Setup.exe` from this repository's Releases and run it. The installer is for the current user, does not require administrator access, and offers an installation folder plus Start menu and desktop shortcuts. Remove it through Windows Settings → Apps → Installed apps. Viewing preferences are retained on uninstall.

Requires Windows 10/11 x64 and an internet connection. This first build is unsigned, so Windows may show an unknown-publisher or SmartScreen warning. No automatic updater is included; use this private repository's Releases for new builds. Never install a copy from an unknown source.

## Controls

| Control | Action |
| --- | --- |
| F11 | Toggle app fullscreen |
| **↑ / ↓ while fullscreen** | **Next / previous channel**, in both app and website video fullscreen |
| Ctrl+Shift+L | Toggle **in-app live captions** |
| Ctrl+Shift+T | Toggle always on top |
| Ctrl+Home | Return to channel guide |
| Ctrl+R or F5 | Reload / retry connection |
| Alt+← / → | Back / forward |
| Ctrl+Plus / Minus / 0 | Zoom in / out / reset |
| Ctrl+Shift+O | Open current Spelunkr page in your browser |

The app menu has the same controls, including **Captions → In-app live captions**. Choose **Captions → Text color → White / Yellow** and **Captions → Text size** (80%, 100%, 125%, 150%, or 200%). Both choices are remembered. Captions have a fully transparent background: only text with a small dark shadow appears over the picture. Fullscreen captions use up to 90% of the screen width and scale with display height; changing size also reflows the text. The overlay follows the video into fullscreen and does not intercept clicks. Press Alt to access the menu. Arrow overrides leave text fields, sliders, subtitle menus, and dialogs alone. Holding an arrow does not repeatedly skip channels. The site's normal shortcuts remain available outside fullscreen.

### Windows native captions

In-app captions use Windows' built-in Live Captions to generate text. Requires **Windows 11 22H2 or later** and the Windows .NET Framework desktop components normally included in Windows 11. Complete Windows' first-time speech-file setup if prompted. A small native helper reads only the Live Captions text control through Windows accessibility, minimizes the Windows caption window, and sends updates locally to the app. Text appears in a closed shadow root; no caption IPC or desktop functions are exposed to site JavaScript.

Ctrl+Shift+L toggles the in-app overlay while the app has focus. Captions start off each time the app opens. Turning captions off or closing Spelunkr restores a pre-existing Windows caption window; if the bridge started Windows captions itself, it closes that window. No transcript or audio is saved by the wrapper.

### Subtitle timing and pauses

Captions use **separate cards of up to two lines**. Text fills the current card, and overflow starts a fresh card that replaces the entire previous one. It does not scroll away the first words or show only the tail of a rolling transcript. Line capacity is measured using the actual font and available video/screen width, so larger text fills a card sooner and wider fullscreen views fit more words.

A full card gets a short reading hold (about 20 characters per second, bounded between 0.833 and 4 seconds from first display) before replacement. Recognition bursts queue forward in order instead of skipping their opening cards. Size and window changes reflow the unconsumed text. Completed cards stay consumed when Windows revises or drops earlier transcript history. When captions are first enabled, existing Windows transcript history is used as a baseline; the overlay begins with new recognized speech.

A pause is inferred after **1.5 seconds without new recognized words**. Once any pending cards have been displayed, the subtitle field clears and remains empty until new speech. Case/punctuation-only corrections do not restart its pause timer. The next phrase contains only newly recognized words, even if Windows keeps earlier text in its rolling transcript. Changing color, size, or fullscreen layout does not revive a completed card or restart its reading hold. Switching channel or turning captions off clears pending cards immediately.

Windows Live Captions supplies text rather than word timestamps or an audio-silence signal. The pause detector therefore follows recognition activity; quiet speech, processing delays, or background audio can affect timing. Audio is not captured by the wrapper. Native Windows captions remain available as a fallback.

The design adapts [Netflix's timing guidance](https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines), which favors a short hold after speech and avoiding flicker, and its [general requirements](https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617-Timed-Text-Style-Guide-General-Requirements), which specify a minimum event duration of five-sixths of a second. The 1.5-second recognition-pause threshold and four-second initial-reading cap are this app's live-caption settings. Prepared subtitles with known speech/shot timestamps can follow those guidelines more precisely.

This uses Windows' accessible window structure rather than a public Live Captions text API, so a Windows update can require adjustments. **Captions → Open Windows caption window** remains available as a fallback and for changing the Windows language/settings. The helper does not complete setup or change microphone/privacy settings.

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

The installer is written to `dist/`. Packaging automatically compiles the native captions helper and bundles the local subtitle layout code into a self-contained sandboxed preload. Run `npm run build:captions` before `npm start` when developing; the preload is generated automatically. `npm run pack` creates an unpacked app for testing. Original icons are checked in; regenerate with `powershell -File scripts/make-icon.ps1` if needed. Dependencies and runtime versions are pinned in `package-lock.json`.

The Windows GitHub Actions workflow builds an installer and checksum on manual dispatch or version-tag pushes. It does not publish anything publicly.

## Existing app research

Checked November 6, 2026: Spelunkr's [official app page](https://spelunkr.tv/app) lists Android, Android TV/Google TV, and Fire TV builds. An [independent LG webOS client](https://github.com/Nikolay1243/spelunkr-webos) also exists. No standalone Windows download was found in the official pages, GitHub searches, or Microsoft Store search. This is a bounded search, not a claim that no private or unindexed app exists.

The site also supplies a web-app manifest. You can already install it through Microsoft Edge's **More tools → Apps → Install this site as an app**. This repository provides the separately packaged Windows installer, fullscreen channel arrows, and native Live Captions command requested by its owner.

## License

MIT for this wrapper and its original icon only. Spelunkr's name, website, styling, programming, and third-party videos remain the property of their respective owners.
