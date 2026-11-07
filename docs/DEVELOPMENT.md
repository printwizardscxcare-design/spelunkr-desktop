# Building and maintaining the app

The app is an Electron wrapper around the live Spelunkr website. The desktop code handles the window, menus, fullscreen keys, and caption overlay. Channels and playback come from the website.

## Get the source

Clone the repository, then open its folder:

```sh
git clone https://github.com/printwizardscxcare-design/spelunkr-desktop.git
cd spelunkr-desktop
```

You'll need Node.js 24 or newer, Git, CMake 3.21 or newer, and a C++17 compiler. Building captions downloads pinned Whisper.cpp source and verifies the downloaded speech models against their SHA-256 hashes. The model files and compiled helpers go in `native/bin/`, which is ignored by Git.

## Windows

Install Visual Studio C++ Build Tools with the Windows SDK and C++ desktop-development tools. The optional Windows Live Captions reader also uses Windows' .NET Framework C# compiler.

In PowerShell:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run dist -- --publish never
```

Using `npm.cmd` avoids PowerShell's restriction on running the `npm.ps1` launcher. The result is a Windows x64 installer in `dist/`. `npm.cmd run pack` creates an unpacked Windows app instead.

## Linux

The release workflow builds on Ubuntu 22.04. Install `g++`, `cmake`, `rpm`, and `libarchive-tools`, along with Node.js and Git, then run:

```sh
npm ci
npm test
npm run dist:linux -- --publish never
```

This creates Debian, Arch, and Fedora packages in `dist/`. Use an older supported glibc build host when producing releases; a helper compiled on a newer distribution can require libraries missing from older ones.

## Mac

You'll need Xcode command-line tools, Swift 5.9 or newer, CMake, Node.js, and a macOS 14.2+ SDK. Build on the architecture you're packaging: the native helper uses the host architecture, so the Electron packaging flag alone doesn't cross-compile it.

```sh
npm ci
npm test
```

On an **Intel Mac**:

```sh
npm run dist:mac -- --x64 --publish never
```

On an **Apple Silicon Mac**:

```sh
npm run dist:mac -- --arm64 --publish never
```

The output includes a DMG and an app ZIP. Builds use an ad-hoc signature and aren't Apple-notarized. Wider distribution will need Developer ID signing and notarization.

## Run a development copy

Build the helpers once, then start Electron:

```sh
npm run build:captions
npm start
```

Use `npm.cmd` for these commands in PowerShell if needed. `npm start` rebuilds the generated preload. That preload embeds the local pagination module so it can run inside Electron's renderer sandbox.

## How captions fit together

`src/caption-options.cjs` selects the engine and capture method. Whisper uses WASAPI speaker loopback on Windows, the PulseAudio speaker monitor on Linux, and AudioTee's Core Audio tap on Mac. Audio is converted to mono 16 kHz PCM; none of these paths selects a microphone.

`native/whisper/main.cpp` runs Whisper and Silero speech detection. Faster mode recognizes a growing phrase and publishes words confirmed by consecutive results. It finalizes at pauses, keeps overlap across forced phrase limits, and bounds the waiting queue. `transcript.h` handles revisions and absolute word positions; its C++ regression checks run during native builds. This follows the local-agreement approach described by [Whisper-Streaming](https://github.com/ufal/whisper_streaming). The x64 build selects a compatible CPU-processing library at runtime. Apple Silicon uses a static native CPU build. Users don't need Python, CUDA, or build tools to run the installed app.

The helper sends text and speech-activity events to `src/caption-bridge.cjs`. The bridge handles process startup, idle audio, and shutdown. `src/caption-cues.cjs` handles pauses and recognition history; `src/caption-pages.cjs` measures and replaces whole two-line blocks in the renderer. Channel changes restart Whisper so earlier-channel audio doesn't appear in the new channel's captions.

`caption-timing.cjs` delays text and pause clears by the same saved offset. Reset events cancel the queue immediately. Playback pause stops recognition; resume and seek start fresh without another rewind.

`controls-model.js` defines action IDs, defaults, validation, and controller press tracking. `controls-runtime.cjs` applies saved inputs in the isolated preload. `control-manager.cjs` validates IPC sources and saves drafts atomically from a local settings window. Keyboard input requires trusted events; controller input requires focus. The settings window loads the live site's fonts with a restricted font-only policy. The fullscreen menu invokes the same player button with a user gesture, and the preload supplies a visible exit button.

Faster mode uses quantized `tiny.en`; Balanced uses quantized `base.en`. Both are included. The optional Windows engine uses `native/CaptionReader.cs` to read the Windows caption window, minimize it, and restore or close it when stopped.

The display borrows the separate-cue approach used by [WebVTT](https://www.w3.org/TR/webvtt1/#a-simple-caption-file). Reading holds are about 20 characters per second, bounded between 0.833 and 4 seconds per block. [Netflix's subtitle guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide) is a reference for line and reading-time choices, not a claim that generated captions meet prepared-subtitle delivery standards.

## Tests and releases

`npm test` covers URL policy, window state, channel arrows, caption timing and layout, and process cleanup. Packaging also checks the copied speech models and streaming recognition before compressing the installers. [Testing notes](TESTING.md) describe platform checks and their limits.

To publish a new preview:

1. Update the package version, lockfile, download links, and `docs/releases/VERSION.md`. Release-note links should be full URLs so they also work on GitHub's release page.
2. Commit the changes and tag that commit. Pushing a `v*` tag starts the Windows, Linux, and Mac installer workflows. Manual runs work too, but all three must build the same commit.
3. Wait for the builds and platform checks. Run [Check downloaded Mac installers](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/workflows/mac-install-check.yml) with the Mac build run ID to test the DMGs on clean runners.
4. Create a draft release for the existing tag if GitHub blocks automated release creation. Leave it unpublished for the upload workflow.
5. Run [Publish tested installers](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/workflows/release.yml) with the three build run IDs. It checks the source commit, version, tag, and file hashes before attaching the installers and publishing the preview. It refuses to replace an already-published release.

If a Linux check needs updating without changing the app, run **Linux installers** with `artifact-run` set to the existing build ID. A successful recheck can be passed to the publisher as `linux-check-run`; it must identify that exact installer build.

Published release descriptions are kept in `docs/releases/`. After editing one, update its GitHub release body too:

```sh
gh release edit v0.6.0 --notes-file docs/releases/0.6.0.md
```

## Desktop security and storage

Remote pages run with Node integration disabled, context isolation, and Chromium sandboxing. Website JavaScript has no caption-control or audio-control API. Captions are displayed as text in a closed shadow root.

Navigation stays within Spelunkr and pinned authentication endpoints. Other HTTPS links open in the default browser. Page downloads and other URL schemes are blocked.

The app stores preferences and the website's browser data locally. It doesn't save audio or transcripts or add analytics. Website assets and videos aren't bundled. See [component credits](../native/WHISPER-NOTICES.md) for the licenses shipped with the speech helpers.
