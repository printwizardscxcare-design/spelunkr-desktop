# Spelunkr Desktop

An unofficial Windows and Linux app for [spelunkr.tv](https://spelunkr.tv/). Watch in its own window, change channels with the arrow keys, and put captions right over the picture.

## Download and install

**[Download the Windows installer — v0.4.0](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.4.0/Spelunkr-Desktop-0.4.0-Windows-x64-Setup.exe)**

[Release notes and checksum](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.4.0) · [All releases](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases)

You'll need **64-bit Windows 10 or Windows 11** and an internet connection. The live-caption feature needs **Windows 11 22H2 or newer**.

1. Download the installer using the link above. Choose the `.exe` file, rather than GitHub's source-code ZIP.
2. Open the downloaded file and follow the installer. You can choose where to install it and add Start menu and desktop shortcuts. It installs for your Windows account without administrator access.
3. Open **Spelunkr Desktop (Unofficial)** and choose a channel.

The installer isn't digitally signed yet, so Windows may show an unknown-publisher or SmartScreen warning.

This repository is private for now. You'll need to sign in to a GitHub account with access to download the installer.

## Linux downloads

There are packages for **Debian, Arch Linux, and Fedora**. Download the matching file from the [Linux release](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.5.0), then follow the [Linux installation instructions](docs/LINUX.md).

Linux includes local English captions with the same transparent text, color and size settings, subtitle blocks, and fullscreen controls. It uses Vosk instead of Windows Live Captions. Always on top depends on the desktop; it is unavailable in native Wayland sessions.

## What it does

Spelunkr runs as the live website, so its channels and schedules stay up to date. This app adds a few things for watching on a PC:

- **Fullscreen channel surfing.** Press Up or Down to change channels without leaving fullscreen.
- **Always on top.** Keep the window visible while doing something else.
- **Captions over the video.** Choose white or yellow text on a transparent background, with five text sizes to pick from.
- **Subtitle-style blocks.** Captions fill up to two lines, then start a fresh block. They clear during pauses instead of hanging around on screen.

There's no account needed to watch. An optional Discord sign-in comes from the website itself.

## Captions

On Windows, press **Ctrl+Shift+L**, or choose **Captions → In-app live captions**. On first use, Windows may ask you to download speech files. Finish that setup and then turn captions on in the app.

Under **Captions**, you can change the text color and size. Those choices are saved. Fullscreen captions adjust to the screen, and larger text fits fewer words in each block.

The text comes from Windows Live Captions. Its window runs minimized while the app displays the subtitles. Windows captions all PC audio, so you may also see speech from another app if it's playing sound. Recognition can make mistakes, and pauses are estimated from text updates rather than exact speech timings.

If captions stop working, try turning them off and on again. **Captions → Open Windows caption window** opens the original Windows controls for setup or troubleshooting. The video's own CC tracks, when available, are separate.

## Handy keys

| Key | Action |
| --- | --- |
| F11 | Enter or leave fullscreen |
| Up / Down in fullscreen | Next / previous channel |
| Ctrl+Shift+L | Turn in-app captions on or off |
| Ctrl+Shift+T | Turn always on top on or off |
| Ctrl+Home | Go back to the channel guide |
| Ctrl+R or F5 | Refresh the page |
| Ctrl+Shift+O | Open the current channel in your browser |

Press **Alt** to reach the app menu. The website's usual player shortcuts also work.

## Updates and uninstalling

For updates, download the installer from [Releases](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases) and run it again. There isn't an automatic updater yet.

To remove the app, open **Windows Settings → Apps → Installed apps**, find **Spelunkr Desktop**, and choose **Uninstall**. Your viewing preferences are kept.

## A few things to know

This is a fan-made app. It isn't affiliated with Spelunkr or the Internet Archive. Their names, website, artwork, and videos belong to their respective owners.

The app doesn't host videos, save caption transcripts, or add analytics. The live website still makes its own network requests; see [Spelunkr's privacy information](https://spelunkr.tv/about). For casting, use **Open in browser** and cast from Chrome.

Found something broken? [Open an issue](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues) and include your operating system and version and what happened.

For source builds, see [the development notes](docs/DEVELOPMENT.md). Maintainers can [check installer download counts](docs/DOWNLOADS.md).

The desktop app's code and original icon are covered by the [MIT license](LICENSE).
