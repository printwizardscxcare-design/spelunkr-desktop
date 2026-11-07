# Installing on Windows

You'll need **Windows 10 or Windows 11 on a 64-bit Intel or AMD PC** and an internet connection to watch channels. Built-in Whisper captions work on both Windows versions. Only the optional Windows Live Captions engine needs Windows 11 22H2 or newer.

## Install

1. [Download the 0.7.0 Windows installer](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Windows-x64-Setup.exe).
2. Open the `.exe` and follow the installer. You can choose an install folder and add desktop and Start menu shortcuts. It installs for your Windows account without administrator access.
3. Open **Spelunkr Desktop (Unofficial)** and choose a channel.

The installer isn't digitally signed, so Windows may show an unknown-publisher or SmartScreen warning. Download it from this repository's [release page](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.7.0). That page also includes a SHA-256 checksum in `SHA256SUMS.txt`.

GitHub's **Source code** ZIP contains the project files; use the `.exe` to install the app.

## Start watching

Use **Up / Down** to change channels in windowed or fullscreen views. **F11** toggles fullscreen. **Ctrl+Shift+L** turns captions on or off while the app has focus; turning them on rewinds 15 seconds once. Captions start off.

Whisper and its English models come with the app. You don't need Windows speech files or a speech-service account for the default engine. See the [caption guide](CAPTIONS.md) for color, size, recognition speed, and the optional Windows 11 engine.

## Update or uninstall

To update, quit the app, download the newer installer, and run it. There isn't an automatic updater.

To uninstall, find **Spelunkr Desktop** under **Settings → Apps** and choose **Uninstall**. The app keeps its preferences and website storage in `%APPDATA%\Spelunkr Desktop\`.

## If something isn't working

Click inside the app before using a shortcut. These are app shortcuts, so **Ctrl+Shift+L** won't turn captions on when another program has focus.

If a channel won't load, check your internet connection and use **Navigate → Reload / Retry connection**. **Spelunkr → Open in browser** can help check whether the same channel plays on the website.

For missing or delayed captions, start with the [caption troubleshooting steps](CAPTIONS.md#troubleshooting). [Testing notes](TESTING.md) describe the checks performed on this release, including the limits of Windows 10 testing.

[Back to downloads](../README.md#download)
