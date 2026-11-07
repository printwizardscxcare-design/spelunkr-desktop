# Spelunkr Desktop

An unofficial Windows, Mac, and Linux app for [spelunkr.tv](https://spelunkr.tv/). Watch in its own window, change channels with the arrow keys, and put captions right over the picture.

## Windows download and install

**[Download the Windows installer — v0.6.0](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Windows-x64-Setup.exe)**

[Release notes and checksum](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.6.0) · [All releases](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases)

You'll need **64-bit Windows 10 or Windows 11** and an internet connection. Built-in captions work on both. The optional Windows Live Captions engine needs Windows 11 22H2 or newer.

1. Download the installer using the link above. Choose the `.exe` file, rather than GitHub's source-code ZIP.
2. Open the downloaded file and follow the installer. You can choose where to install it and add Start menu and desktop shortcuts. It installs for your Windows account without administrator access.
3. Open **Spelunkr Desktop (Unofficial)** and choose a channel.

The installer isn't digitally signed yet, so Windows may show an unknown-publisher or SmartScreen warning.

This repository is private for now. You'll need to sign in to a GitHub account with access to download the installer.

## Mac downloads

| Your Mac | Download |
| --- | --- |
| Intel processor | [Intel Mac (.dmg)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Mac-x64.dmg) |
| Apple Silicon / M-series chip | [Apple Silicon Mac (.dmg)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Mac-arm64.dmg) |

You'll need **macOS 14.2 or newer**. Open the DMG, drag the app into Applications, and launch it there. The preview isn't notarized by Apple yet, and captions need system-audio recording permission. See the [Mac installation instructions](docs/MAC.md) for the first launch and permission steps. Mac speaker capture still needs testing on a physical Mac.

## Linux downloads

Choose the package for your distribution. These builds are for 64-bit Intel and AMD PCs.

| Distribution | Download |
| --- | --- |
| Debian 12 or newer | [Debian installer (.deb)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Debian-amd64.deb) |
| Arch Linux | [Arch package (.pkg.tar.xz)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Arch-x64.pkg.tar.xz) |
| Fedora Workstation 43 or newer | [Fedora installer (.rpm)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Fedora-x86_64.rpm) |

Follow the [Linux installation instructions](docs/LINUX.md). [Release notes and checksums](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.6.0) are included with the downloads.

Linux includes local English captions with the same transparent text, color and size settings, subtitle blocks, and fullscreen controls. It uses the same Whisper engine as Windows and Mac. Always on top depends on the desktop; it is unavailable in native Wayland sessions.

## What it does

Spelunkr runs as the live website, so its channels and schedules stay up to date. This app adds a few things for watching on a PC:

- **Fullscreen channel surfing.** Press Up or Down to change channels without leaving fullscreen.
- **Always on top.** Keep the window visible while doing something else.
- **Captions over the video.** Choose white or yellow text on a transparent background, with five text sizes to pick from.
- **Subtitle-style blocks.** Captions fill up to two lines, then start a fresh block. They clear during pauses instead of hanging around on screen.

There's no account needed to watch. An optional Discord sign-in comes from the website itself.

## Captions

Press **Ctrl+Shift+L** on Windows/Linux or **Command+Shift+L** on Mac, or choose **Captions → In-app live captions**.

Whisper generates English captions on your computer using models included in the download. There's no speech account or subscription to set up. Captions listen to speaker output, which can include other apps; they don't select a microphone or save audio or transcripts.

Under **Captions**, choose the text color and size. Faster recognition is the default for shorter delays. Choose **Recognition speed → Balanced** for the larger model if your computer can keep up. These choices are saved. Fullscreen captions adjust to the screen, and larger text fits fewer words in each block.

Speech detection keeps captions from clearing between recognition batches while dialogue continues. Text appears in short subtitle blocks and clears after pauses, with time to read. Recognition has a delay and can make mistakes. If you change your audio output, turn captions off and on to reconnect.

On Windows 11, **Captions → Caption engine → Windows Live Captions** keeps the original Windows option available. Its window is minimized while the app displays its text. First-use speech downloads and Windows' setup apply only to that optional engine. The video's own CC tracks, when available, are separate.

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

On Mac, use Command instead of Ctrl, and **Control+Command+F** for fullscreen. On Windows/Linux, press **Alt** to reach the app menu. The website's usual player shortcuts also work.

## Updates and uninstalling

For updates, download the installer from [Releases](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases) and run it again. There isn't an automatic updater yet.

To remove the app, open **Windows Settings → Apps → Installed apps**, find **Spelunkr Desktop**, and choose **Uninstall**. Your viewing preferences are kept.

## A few things to know

This is a fan-made app. It isn't affiliated with Spelunkr or the Internet Archive. Their names, website, artwork, and videos belong to their respective owners.

The app doesn't host videos, save caption transcripts, or add analytics. The live website still makes its own network requests; see [Spelunkr's privacy information](https://spelunkr.tv/about). For casting, use **Open in browser** and cast from Chrome.

Found something broken? [Open an issue](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues) and include your operating system and version and what happened.

For source builds, see [the development notes](docs/DEVELOPMENT.md). Maintainers can [check installer download counts](docs/DOWNLOADS.md).

The desktop app's code and original icon are covered by the [MIT license](LICENSE).
