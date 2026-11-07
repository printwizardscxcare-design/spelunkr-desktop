# Working on Spelunkr Desktop

## Build requirements

All platforms need Node.js 24+, Git, CMake 3.21+, and a C++17 compiler. The build downloads pinned Whisper.cpp source and checksum-verified English base/tiny models plus Silero speech detection. Generated files stay under `native/bin/` and aren't committed.

Windows also needs Visual Studio C++ Build Tools and its Windows SDK. The optional Windows Live Captions reader uses Windows' .NET Framework C# compiler. Linux packages build on Ubuntu 22.04 with `g++`, `cmake`, `rpm`, and `libarchive-tools`. Use an older supported glibc build host for compatibility with newer distributions. Mac builds need Xcode command-line tools, Swift 5.9+, and a macOS 14.2+ SDK; use a native Intel or Apple Silicon runner for each architecture.

## Commands

```sh
npm ci
npm test
# Windows
npm run dist -- --publish never
# Debian, Arch, Fedora
npm run dist:linux -- --publish never
# Mac, on the matching architecture
npm run dist:mac -- --x64 --publish never
npm run dist:mac -- --arm64 --publish never
```

Installers go in `dist/`. For development, run `npm run build:captions` once, then `npm start`. `npm run pack` makes an unpacked Windows app. Packaging always rebuilds the native C++ helper. The generated preload embeds the local caption pagination module so it can run in Electron's renderer sandbox.

The x64 build ships CPU-specific processing libraries and selects a compatible optimized kernel at runtime, with a baseline fallback. Apple Silicon uses a static native CPU build. It does not require Python, a CUDA driver, or a speech-service account on the user's computer. Apple Silicon uses its native ARM CPU implementation. Balanced recognition uses quantized `base.en`; Faster uses quantized `tiny.en`. Both model files are bundled.

## Audio and recognition

`native/whisper/main.cpp` loads Whisper and Silero VAD. Windows reads the default rendering endpoint with WASAPI loopback, downmixes the reported speaker format, and resamples it to mono 16 kHz. Linux's `parec` selects `@DEFAULT_MONITOR@`. Mac uses the pinned AudioTee CLI and Core Audio taps with `--sample-rate 16000`. Neither capture path selects a microphone.

The local bridge pipes PCM from the Linux/Mac capture process to the recognizer. It supplies silent PCM after capture callback gaps so the final phrase can finish. EOF, disabling captions, engine changes, and app shutdown stop both processes; forced cleanup is bounded. Windows handles idle speaker packets in the helper.

Speech detection uses continuous 512-sample frames. The pipeline keeps a short preroll, ends a phrase after about half a second of detected silence, and caps chunks at about 2.5 seconds with overlap. A bounded inference queue prevents unlimited latency growth. Falling behind produces a status message suggesting Faster mode. Whisper's output is appended to a bounded rolling snapshot, with overlap deduplication. No speech model runs in the website renderer and no audio or transcript is saved.

The optional Windows engine still reads the accessible Windows Live Captions text control, minimizes its window after connecting, and restores/closes it when stopped. Only that engine needs Windows 11 22H2+ and Windows speech-file setup.

## Subtitle display

The main process follows new words and clears captions after a pause, with bounded reading time. Whisper sends speech/silence activity so recognition batching is not mistaken for a pause. Ongoing speech cancels the clear timer. Channel changes restart Whisper to discard audio and inference from the earlier channel. Punctuation and case corrections don't restart the pause clock. Existing Windows native-caption history is a baseline; Whisper starts a new session with no earlier transcript.

The renderer measures text with the selected font and available width. Cards hold up to two lines, carry unread overflow forward, and replace the whole block. Reading holds use about 20 characters per second, between 0.833 and 4 seconds per card. Color and size changes reflow pending text. Channel changes and turning captions off clear the queue. Fullscreen uses the available picture width and height.

This follows the separate-cue pattern in [WebVTT](https://www.w3.org/TR/webvtt1/#a-simple-caption-file) and line/timing guidance in [Netflix's subtitle guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide), adapted for delayed live recognition rather than prepared subtitle timestamps.

## Checks and releases

Before compression, `scripts/after-pack.cjs` checks the actual copied native resources. `scripts/check-whisper.cjs` tests both models, reports CPU inference timing, rejects invented captions during silent PCM, recognizes streaming speech, and checks EOF cleanup. CI timing is hardware-specific; it is not a benchmark of every user's computer.

Linux CI installs the packages in Debian 13, Fedora 43, and current Arch containers, then checks speaker-monitor recognition and X11 startup. Mac CI builds separately on Intel and Apple Silicon, verifies the ad-hoc app signature and audio permission description, checks the capture CLI, and launches the app. These tests do not grant privacy permissions or validate physical Mac audio capture. Windows CI compiles for Windows 10 APIs and checks recognition; it is not a separate Windows 10 hardware test.

The Publish tested installers workflow accepts successful Windows, Linux, and Mac run IDs. Create the version tag at the tested source commit first. If GitHub restricts automated release creation, create a draft release for that existing tag through the maintainer account; the workflow verifies the tag, attaches files, and publishes the draft. It requires the same source commit and version, checks installer hashes, then creates a prerelease with all files. A successful Linux recheck can validate existing installer artifacts after test-harness changes; its run title must identify exactly the selected build. Rechecking uses the production capture bridge, including capture latency and idle audio handling. Mac DMGs and ZIP alternatives are signed ad hoc but aren't Apple-notarized. Windows installers are unsigned. Trusted Mac distribution will need an Apple Developer ID signing/notarization setup.

## Desktop boundaries

- Remote pages have Node integration disabled, context isolation, and Chromium sandboxing.
- No caption or audio-control IPC is exposed to website JavaScript. Caption text is displayed in a closed shadow root.
- Navigation is limited to Spelunkr and pinned authentication endpoints. Other HTTPS links open in the default browser. Page file downloads and other URL schemes are blocked.
- The app stores window state, caption preferences, and the website's browser storage locally. It adds no analytics.

The website assets and videos aren't bundled and aren't covered by this repository's license. Third-party speech model and capture licenses ship with their native resources.
