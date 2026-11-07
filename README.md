# Spelunkr Desktop

I really just wanted ok subtitles, and something separate from my browser. Here you go:

Watch [spelunkr.tv](https://spelunkr.tv/) in its own app on Windows, Mac, or Linux. Go fullscreen, change channels with the arrow keys, and put captions over the video.

This is an unofficial app. It opens the live website, so the channels, schedules, and optional sign-in still come from Spelunkr.

## Download

**Current preview: [0.6.0](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.6.0).** You'll need an internet connection to watch. You don't need a GitHub account to download an installer.

| Computer | Installer | Instructions |
| --- | --- | --- |
| Windows 10 or 11, Intel/AMD 64-bit | [Windows .exe](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Windows-x64-Setup.exe) | [Windows setup](docs/WINDOWS.md) |
| Mac with an Intel processor, macOS 14.2+ | [Intel Mac .dmg](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Mac-x64.dmg) | [Mac setup](docs/MAC.md) |
| Mac with an Apple M-series chip, macOS 14.2+ | [Apple Silicon .dmg](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Mac-arm64.dmg) | [Mac setup](docs/MAC.md) |
| Debian 12+, Intel/AMD 64-bit | [Debian .deb](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Debian-amd64.deb) | [Linux setup](docs/LINUX.md#debian) |
| Arch Linux, Intel/AMD 64-bit | [Arch .pkg.tar.xz](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Arch-x64.pkg.tar.xz) | [Linux setup](docs/LINUX.md#arch-linux) |
| Fedora Workstation 43+, Intel/AMD 64-bit | [Fedora .rpm](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Fedora-x86_64.rpm) | [Linux setup](docs/LINUX.md#fedora) |

Windows installers aren't digitally signed. Mac builds are signed locally but aren't notarized by Apple. The setup guides explain the first-launch prompts. Mac speaker capture and its permission flow still need a physical-Mac test; see [what's been tested](docs/TESTING.md).

## Watching

Open the app and choose a channel. Use **F11** for fullscreen on Windows or Linux, or **Control+Command+F** on Mac. In fullscreen, **Up** goes to the next channel and **Down** goes to the previous one.

The **View** menu also has an always-on-top option. On Linux, that option is disabled when a Wayland session is detected.

## Captions

Press **Ctrl+Shift+L** on Windows/Linux or **Command+Shift+L** on Mac. The app needs keyboard focus for its shortcuts to work.

Whisper generates English captions locally. Both speech models are included in the installer; there's no speech account, subscription, or separate model download. Captions listen to speaker output, which can include other apps playing at the same time.

Under **Captions**, choose white or yellow text and a size. The background stays transparent. Text fills up to two lines, then moves to a fresh block. It clears after pauses, with a little time left to read.

**Faster** recognition is the default. Try **Balanced** for the larger model if your computer can keep up. Captions have a delay and can make mistakes. Windows 11 users can also choose Windows Live Captions as an alternative.

See the [caption guide](docs/CAPTIONS.md) for settings and troubleshooting.

## Keyboard shortcuts

| Action | Windows / Linux | Mac |
| --- | --- | --- |
| Fullscreen | F11 | Control+Command+F |
| Next / previous channel in fullscreen | Up / Down | Up / Down |
| Captions on / off | Ctrl+Shift+L | Command+Shift+L |
| Always on top | Ctrl+Shift+T | Command+Shift+T |
| Channel guide | Ctrl+Home | Command+Home |
| Refresh | Ctrl+R or F5 | Command+R |
| Open the channel in your browser | Ctrl+Shift+O | Command+Shift+O |

On Windows and Linux, **Alt** opens the app menu. The website's own player shortcuts also work.

## Updates and help

Download the new installer from [Releases](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases) to update; there's no automatic updater yet. Each platform's setup guide covers updating and uninstalling.

If something breaks, [open an issue](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues) with your app version, operating system, and what happened. For caption problems, include the selected caption engine and recognition speed.

## About this app

Spelunkr Desktop isn't affiliated with Spelunkr or the Internet Archive. Their website, names, artwork, and videos belong to their respective owners.

The app doesn't host videos, save audio or caption transcripts, or add analytics. It keeps preferences and the website's browser storage on your computer. The live website makes its own network requests.

The wrapper and original icon use the [MIT license](LICENSE). Speech and capture components have their own [licenses and credits](native/WHISPER-NOTICES.md).

For development and maintenance: [build from source](docs/DEVELOPMENT.md), [test coverage](docs/TESTING.md), or [check installer download counts](docs/DOWNLOADS.md).
