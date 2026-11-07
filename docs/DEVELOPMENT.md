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

The Windows installer workflow runs manually or on version-tag pushes. It uploads the installer and checksum as workflow artifacts. The Publish tested installers workflow accepts successful Windows and Linux run IDs, checks that their source commits and versions match, verifies file checksums, and attaches the installers to a prerelease.

## Build on Linux

Build on Ubuntu 22.04 or Debian 12 (x64) with Node.js 24, Python 3.10+, RPM tools, and the usual Electron build dependencies. Build the helper on an older supported glibc system so it also runs on newer distributions.

```sh
python3 -m venv .caption-venv
. .caption-venv/bin/activate
python3 -m pip install -r scripts/linux-caption-requirements.txt
npm ci
npm test
npm run dist:linux -- --publish never
```

This creates Debian, Fedora, and Arch packages in `dist/`. The Linux workflow builds on Ubuntu 22.04 and installs the packages in three distribution containers. The helper and versioned Vosk English model are bundled at build time; generated files stay under `native/bin/`. Delete that generated Linux directory before rebuilding the helper after a source change. For development, build captions once, then `npm start`.

## How captions work

On Windows, the native helper starts or attaches to Windows Live Captions, reads its accessible caption-text control, and minimizes its window once connected. It sends text to the main process through a local pipe. It restores an existing caption window when stopped, or closes one it started itself. Setup and microphone/privacy settings are left to the user.

On Linux, a frozen Python helper uses the bundled Vosk English model and reads 16 kHz mono PCM from `parec` using the default speaker monitor. It uses the same local pipe protocol and caption renderer. Parent EOF and termination stop the capture process. It never falls back to a microphone.

The main process follows new recognized words and infers a pause after 1.5 seconds without word activity. Case and punctuation changes don't restart that timer. Existing Windows transcript history is treated as a baseline when captions are enabled.

The renderer measures text with the selected font and available width. It displays cards of up to two lines, carries overflow to the next card, and keeps unread words queued when recognition delivers a batch. Reading holds use about 20 characters per second, bounded between 0.833 and 4 seconds per card. Size changes reflow unconsumed words. Channel changes and turning captions off clear the queue.

This adapts the separate-cue pattern in [WebVTT's prepared-subtitle examples](https://www.w3.org/TR/webvtt1/#a-simple-caption-file) and the line/timing guidance in [Netflix's subtitle guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide). Windows provides text updates rather than speech timestamps, so the result depends on recognition timing. Changes to Windows' accessible caption window can require updates to the helper.

## Desktop boundaries

- Remote pages run with Node integration disabled, context isolation, and Chromium sandboxing.
- No desktop functions or caption IPC are exposed to website JavaScript. Caption text is displayed in a closed shadow root.
- Navigation within the app is limited to Spelunkr and its pinned authentication endpoints. Other HTTPS links open in the default browser. File downloads and other URL schemes are blocked.
- The wrapper saves window bounds, caption preferences, and the website's browser storage locally. Linux captions capture speaker audio in memory while enabled. The wrapper does not save audio or transcripts.
- Window state, URL policy, caption timing, card replacement, and overlay layout have automated checks in `test/`.

The project is independent of Spelunkr. Its website assets and videos aren't bundled with the app and aren't covered by this repository's license.
