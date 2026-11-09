# Installing on a Mac

You'll need **macOS 14.2 or newer** and an internet connection to watch.

## Choose your installer

Open **Apple menu → About This Mac** and look for the chip or processor:

| About This Mac says | Download |
| --- | --- |
| Apple M1, M2, M3, M4, or another Apple M-series chip | [Apple Silicon installer](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.8.0-beta.2/Spelunkr-Desktop-0.8.0-beta.2-Mac-arm64.dmg) |
| Intel processor | [Intel installer](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.8.0-beta.2/Spelunkr-Desktop-0.8.0-beta.2-Mac-x64.dmg) |

Both builds run natively. The Apple Silicon version doesn't need Rosetta. The [release page](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.8.0-beta.2) also has ZIP copies of the apps and checksums for each architecture.

## Install and open

1. Open the downloaded `.dmg`.
2. Drag **Spelunkr Desktop** into **Applications**.
3. Eject the disk image, then open the app from Applications.

This preview is signed locally but isn't notarized by Apple. If macOS blocks it, try opening the app once, then go to **System Settings → Privacy & Security** and choose **Open Anyway** for Spelunkr Desktop. Follow the confirmation prompt. [Apple explains these first-launch controls](https://support.apple.com/en-us/102445).

If your Mac is managed by a school or workplace, its policy may prevent opening an unnotarized app.

## Captions

Built-in captions start automatically. **Command+Shift+L** toggles them on or off.

Captions start on automatically with built-in Whisper. No speech setup or model download is needed. Turning them on rewinds 15 seconds once and pauses while the app prepares subtitles ahead of the picture. Playback resumes when at least 15 seconds are ready. **Captions → Off** turns them off again.

Whisper reads the channel file directly, so built-in captions don't need microphone or system-audio recording permission. The app doesn't pick up other programs' audio or save audio and transcripts. Both English speech models are included.

Use **Captions → Text color**, **Text size**, and **Subtitle delay** to adjust the overlay. The [caption guide](CAPTIONS.md) covers buffering, timing, and troubleshooting.

The [testing notes](TESTING.md) describe installer, speech-model, and startup checks on both Mac architectures. Full viewing and physical-controller use still need checks on physical Macs.

## Useful keys

| Key | Action |
| --- | --- |
| Control+Command+F | Fullscreen on / off |
| Up / Down | Next / previous channel in windowed or fullscreen views |
| Left / Right | Volume down / up |
| Escape | Exit video fullscreen |
| Command+, | Assign keyboard and controller controls |
| Command+Shift+L | Captions on / off |
| Command+Shift+T | Always on top |
| Command+R | Refresh |
| Command+Shift+O | Open the channel in your browser |
| Command+Q | Quit |

## Update or uninstall

To update, quit the app and replace the copy in Applications with the new download. There's no automatic updater.

To uninstall, quit the app and move it from Applications to the Trash. Preferences and website storage stay in `~/Library/Application Support/Spelunkr Desktop/`.

[Back to downloads](../README.md#download)
