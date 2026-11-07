# Installing on a Mac

You'll need **macOS Sonoma 14.2 or newer** and an internet connection.

## Choose the right download

Open the Apple menu and choose **About This Mac**.

- If you see **Chip: Apple M1, M2, M3, M4**, or another M-series chip, download
  [Apple Silicon (.dmg)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Mac-arm64.dmg).
- If you see **Processor: Intel**, download
  [Intel (.dmg)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Mac-x64.dmg).

Both builds run natively. Apple Silicon users don't need Rosetta. The repository is
private, so downloads require a GitHub account with access.

## Install

1. Open the downloaded `.dmg` file.
2. Drag **Spelunkr Desktop** into **Applications**.
3. Eject the disk image and open the app from Applications.

This preview is signed locally but **isn't notarized by Apple**. If macOS blocks the
first launch, try opening the app once, then open **System Settings → Privacy &
Security** and choose **Open Anyway** for Spelunkr Desktop. Follow Apple's
confirmation prompt. A managed Mac may prevent this until a notarized build is
available. No system-wide security changes are needed.

## Captions and audio permission

Press **Command+Shift+L**, or choose **Captions → In-app live captions**. Allow
system audio recording when macOS asks. If you previously denied it, open
**System Settings → Privacy & Security → Screen & System Audio Recording**
(or **System Audio Recording Only**, depending on your macOS version), enable
Spelunkr Desktop, then quit and reopen the app.

Captions use the included Whisper English models. Speech recognition runs locally;
there's no speech account, Python setup, model download, or cloud subscription.
The app selects speaker output, including other applications, and doesn't select
a microphone. It doesn't save audio or transcripts.

Choose **Captions → Recognition speed → Faster** if captions fall behind. Balanced
uses the base English model; Faster uses the smaller tiny English model. Recognition
arrives in short batches, so it has a delay and can make mistakes. Color, size,
transparent text, two-line blocks, and pause clearing work like the other versions.

After switching speakers or headphones, toggle captions off and on.

## Keys

| Key | Action |
| --- | --- |
| Control+Command+F | Enter or leave fullscreen |
| Up / Down in fullscreen | Next / previous channel |
| Command+Shift+L | Captions on / off |
| Command+Shift+T | Always on top |
| Command+R | Refresh |
| Command+Shift+O | Open the channel in your browser |
| Command+Q | Quit |

To update, quit the app and replace the copy in Applications with the new download.
To uninstall, quit it and move it from Applications to the Trash. Preferences stay
in `~/Library/Application Support/Spelunkr Desktop/`.

## What has been checked

The Mac workflow builds separately on Intel and Apple Silicon runners. It checks
the app signature, bundled models, speech recognition, streaming speech detection,
silence handling, and app startup. The system-audio helper is compiled from pinned
AudioTee source using Apple's Core Audio taps API.

Hosted runners don't reproduce a user's audio-permission prompts and speaker
devices. **Mac live speaker capture and its permission flow still need a physical
Mac test.** This is a preview release; keep that limitation in mind when trying it.
