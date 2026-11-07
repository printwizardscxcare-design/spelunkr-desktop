# Installing on a Mac

You'll need **macOS 14.2 or newer** and an internet connection to watch.

## Choose your installer

Open **Apple menu → About This Mac** and look for the chip or processor:

| About This Mac says | Download |
| --- | --- |
| Apple M1, M2, M3, M4, or another Apple M-series chip | [Apple Silicon installer](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Mac-arm64.dmg) |
| Intel processor | [Intel installer](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Mac-x64.dmg) |

Both builds run natively. The Apple Silicon version doesn't need Rosetta. The [release page](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.7.0) also has ZIP copies of the apps and checksums for each architecture.

## Install and open

1. Open the downloaded `.dmg`.
2. Drag **Spelunkr Desktop** into **Applications**.
3. Eject the disk image, then open the app from Applications.

This preview is signed locally but isn't notarized by Apple. If macOS blocks it, try opening the app once, then go to **System Settings → Privacy & Security** and choose **Open Anyway** for Spelunkr Desktop. Follow the confirmation prompt. [Apple explains these first-launch controls](https://support.apple.com/en-us/102445).

If your Mac is managed by a school or workplace, its policy may prevent opening an unnotarized app.

## Allow captions to use system audio

Press **Command+Shift+L** and allow system audio recording when macOS asks.

Captions start off. Turning them on rewinds the video 15 seconds once; **Captions → Caption engine → None** turns them off again.

If access was denied, open **System Settings → Privacy & Security → Screen & System Audio Recording**. Depending on the macOS version, you may see a separate **System Audio Recording Only** section. Enable access for Spelunkr Desktop, then quit and reopen the app. [Apple's audio-recording permission guide](https://support.apple.com/guide/mac-help/control-access-screen-system-audio-recording-mchld6aa7d23/mac) shows where these controls live.

Whisper uses speaker output, which can include other apps. It doesn't select a microphone or save audio or transcripts. The included models recognize English. See the [caption guide](CAPTIONS.md) for appearance, speed, and troubleshooting.

The installers, speech models, and app startup passed automated checks on Intel and Apple Silicon Macs. **Live speaker capture and the permission flow still need a physical-Mac test.** The [testing notes](TESTING.md) explain that limit.

## Useful keys

| Key | Action |
| --- | --- |
| Control+Command+F | Fullscreen on / off |
| Up / Down | Next / previous channel in windowed or fullscreen views |
| Command+Shift+L | Captions on / off |
| Command+Shift+T | Always on top |
| Command+R | Refresh |
| Command+Shift+O | Open the channel in your browser |
| Command+Q | Quit |

## Update or uninstall

To update, quit the app and replace the copy in Applications with the new download. There's no automatic updater.

To uninstall, quit the app and move it from Applications to the Trash. Preferences and website storage stay in `~/Library/Application Support/Spelunkr Desktop/`.

[Back to downloads](../README.md#download)
