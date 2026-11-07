# Installing on Windows

You'll need **Windows 10 or Windows 11 on a 64-bit Intel or AMD PC** and an internet connection to watch channels. Built-in Whisper captions work on both Windows versions. Only the optional Windows Live Captions engine needs Windows 11 22H2 or newer.

## Install

1. [Download the 0.7.0 Windows installer](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Windows-x64-Setup.exe).
2. Open the `.exe` and follow the installer. You can choose an install folder and add desktop and Start menu shortcuts. It installs for your Windows account without administrator access.
3. Open **Spelunkr Desktop (Unofficial)** and choose a channel.

The installer isn't digitally signed, so Windows may show an unknown-publisher or SmartScreen warning. Download it from this repository's [release page](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.7.0). That page also includes a SHA-256 checksum in `SHA256SUMS.txt`.

GitHub's **Source code** ZIP contains the project files; use the `.exe` to install the app.

## Start watching

Use **Up / Down** for channels and **Left / Right** for volume. **F11** uses video fullscreen; **Escape** or the visible Exit fullscreen button returns to the window. **Settings → Controls…** lets you assign different keys or controller inputs, then Save them together.

**Ctrl+Shift+L** turns captions on or off while the app has focus. Turning them on rewinds 15 seconds once and pauses to prepare a cache ahead of the video. Playback resumes when at least 15 seconds are recognized. Captions start off.

Whisper and its English models come with the app. Built-in captions read the channel file directly, work with the player muted, and don't use other programs' audio. You don't need Windows speech files or a speech-service account. See the [caption guide](CAPTIONS.md) for color, size, subtitle delay, recognition speed, and the optional Windows 11 live engine.

## Update or uninstall

To update, quit the app, download the newer installer, and run it. There isn't an automatic updater.

To uninstall, find **Spelunkr Desktop** under **Settings → Apps** and choose **Uninstall**. The app keeps its preferences and website storage in `%APPDATA%\Spelunkr Desktop\`.

## If something isn't working

Click inside the app before using a shortcut. These are app shortcuts, so **Ctrl+Shift+L** won't turn captions on when another program has focus.

If a channel won't load, check your internet connection and use **Navigate → Reload / Retry connection**. **Spelunkr → Open in browser** can help check whether the same channel plays on the website.

For missing or delayed captions, start with the [caption troubleshooting steps](CAPTIONS.md#troubleshooting). [Testing notes](TESTING.md) describe the checks performed on this release, including the limits of Windows 10 testing.

[Back to downloads](../README.md#download)
