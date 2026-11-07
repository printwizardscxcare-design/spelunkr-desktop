# Working on Spelunkr Desktop

## Build on Windows

Install Node.js 24 or later, then run:

```powershell
npm ci
npm test
npm run dist -- --publish never
```

The installer is written to `dist/`. Packaging compiles `native/CaptionReader.cs` with Windows' .NET Framework C# compiler and builds the sandboxed preload from the local caption-layout code. Generated files and installers aren't committed to Git.

For a local development window:

```powershell
npm run build:captions
npm start
```

`npm run pack` builds an unpacked app. `scripts/make-icon.ps1` regenerates the original app icon. Dependency versions are pinned in `package-lock.json`.

The Windows installer workflow runs manually or on version-tag pushes. It uploads the installer and checksum as workflow artifacts. Release assets are attached separately.

## How captions work

The native helper starts or attaches to Windows Live Captions, reads its accessible caption-text control, and minimizes its window once connected. It sends text to the main process through a local pipe. It restores an existing caption window when stopped, or closes one it started itself. Setup and microphone/privacy settings are left to the user.

The main process follows new recognized words and infers a pause after 1.5 seconds without word activity. Case and punctuation changes don't restart that timer. Existing Windows transcript history is treated as a baseline when captions are enabled.

The renderer measures text with the selected font and available width. It displays cards of up to two lines, carries overflow to the next card, and keeps unread words queued when recognition delivers a batch. Reading holds use about 20 characters per second, bounded between 0.833 and 4 seconds per card. Size changes reflow unconsumed words. Channel changes and turning captions off clear the queue.

This adapts the separate-cue pattern in [WebVTT's prepared-subtitle examples](https://www.w3.org/TR/webvtt1/#a-simple-caption-file) and the line/timing guidance in [Netflix's subtitle guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide). Windows provides text updates rather than speech timestamps, so the result depends on recognition timing. Changes to Windows' accessible caption window can require updates to the helper.

## Desktop boundaries

- Remote pages run with Node integration disabled, context isolation, and Chromium sandboxing.
- No desktop functions or caption IPC are exposed to website JavaScript. Caption text is displayed in a closed shadow root.
- Navigation within the app is limited to Spelunkr and its pinned authentication endpoints. Other HTTPS links open in the default browser. File downloads and other URL schemes are blocked.
- The wrapper saves window bounds, caption preferences, and the website's browser storage locally. It doesn't capture audio or save transcripts.
- Window state, URL policy, caption timing, card replacement, and overlay layout have automated checks in `test/`.

The project is independent of Spelunkr. Its website assets and videos aren't bundled with the app and aren't covered by this repository's license.
