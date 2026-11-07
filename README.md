# Spelunkr Desktop

I really just wanted ok subtitles, and something separate from my browser. Here you go:

An unofficial desktop app for [spelunkr.tv](https://spelunkr.tv/). Pick a channel, put the video fullscreen, and turn on captions when you need them.

The channels and shows come from the live website. The app gives them their own window and adds English captions that run on your computer.

**[Download the Windows installer](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Windows-x64-Setup.exe)** · **[All downloads](#download)** · **[Help with captions](docs/CAPTIONS.md)** · **[Report a problem](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues)**

## Download

The current download is **[0.6.0, a preview](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.6.0)**. You don't need a GitHub account to download it. Watching needs an internet connection.

**0.7.0 is still being tested.** Custom controls, subtitle delay, the fullscreen fix, and the other changes [listed below](#coming-in-070) aren't in these installers yet. The next set of downloads will be published together after testing.

| Your computer | Download | Setup guide |
| --- | --- | --- |
| Windows 10 or 11 · Intel/AMD 64-bit | [Windows installer (.exe)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Windows-x64-Setup.exe) | [Windows](docs/WINDOWS.md) |
| Mac · Apple M-series chip · macOS 14.2+ | [Apple Silicon (.dmg)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Mac-arm64.dmg) | [Mac](docs/MAC.md) |
| Mac · Intel processor · macOS 14.2+ | [Intel Mac (.dmg)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Mac-x64.dmg) | [Mac](docs/MAC.md) |
| Debian 12+ · Intel/AMD 64-bit | [Debian (.deb)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Debian-amd64.deb) | [Debian](docs/LINUX.md#debian) |
| Arch Linux · Intel/AMD 64-bit | [Arch (.pkg.tar.xz)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Arch-x64.pkg.tar.xz) | [Arch](docs/LINUX.md#arch-linux) |
| Fedora Workstation 43+ · Intel/AMD 64-bit | [Fedora (.rpm)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.6.0/Spelunkr-Desktop-0.6.0-Fedora-x86_64.rpm) | [Fedora](docs/LINUX.md#fedora) |

Not sure which Mac download to choose? Open **Apple menu → About This Mac**. “Chip” followed by an Apple M-series name means Apple Silicon; “Processor” followed by Intel means Intel.

## Install and start watching

**Windows:** Open the downloaded `.exe`, follow the installer, then launch **Spelunkr Desktop (Unofficial)** from Start or your desktop shortcut. It installs for your account without administrator access.

**Mac:** Open the `.dmg`, drag **Spelunkr Desktop** into **Applications**, then open it from there.

**Linux:** Download your distribution's package and install it from the download folder:

```sh
# Debian
sudo apt install ./Spelunkr-Desktop-0.6.0-Debian-amd64.deb

# Arch — update your system first
sudo pacman -Syu
sudo pacman -U ./Spelunkr-Desktop-0.6.0-Arch-x64.pkg.tar.xz

# Fedora
sudo dnf install ./Spelunkr-Desktop-0.6.0-Fedora-x86_64.rpm
```

Then open **Spelunkr Desktop** from your applications menu. Linux captions need PulseAudio or PipeWire with PulseAudio compatibility; the [Linux guide](docs/LINUX.md#sound-setup) covers sound setup.

Use the installer for your computer, rather than GitHub's **Source code** ZIP. Windows installers are unsigned, and Mac builds aren't notarized by Apple, so first-launch prompts are possible. See the setup guide for your platform. File checksums are on the [release page](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.6.0).

## Turn on captions

Click the app, then press **Ctrl+Shift+L** on Windows/Linux or **Command+Shift+L** on Mac. You can also use **Captions → In-app live captions**. Captions start off; the same shortcut turns them off again.

Whisper and both English speech models come with the installer. There's no speech account, subscription, or separate model download. Recognition runs locally and uses speaker output, so speech from another app can show up too.

The **Captions** menu lets you choose:

- **White or yellow text**, with a transparent background.
- **Five text sizes**, with wider two-line blocks in video fullscreen.
- **Faster or Balanced recognition.** Faster is the default; Balanced uses the larger model.
- **Windows Live Captions** as an optional alternative on Windows 11 22H2 or newer. Whisper also works on Windows 10.

Generated captions can lag behind speech or get words wrong. Timing and pause handling are being improved for the next release. **Mac live speaker capture and its permission prompts still need a physical-Mac test.** The [testing notes](docs/TESTING.md) explain what's been checked.

The [caption guide](docs/CAPTIONS.md) covers settings and troubleshooting, including changes being prepared for 0.7.0.

## Coming in 0.7.0

These changes are in the source code and are being checked before release:

- **Up/Down for channels, Left/Right for volume**, in both windowed and fullscreen views.
- **Custom keyboard and controller controls.** Open Settings → Controls, click Assign beside an action, press your key or controller input, then Save when you're done. The menu uses the site's fonts, colors, and buttons.
- **One video fullscreen mode** for the menu, keyboard shortcut, and video button, with a visible Exit fullscreen button and Escape to leave it.
- **A None caption option** and a single 15-second rewind when captions go from off to on.
- **Subtitle delay from 0–10 seconds**, adjustable in 0.1-second steps and saved between launches.
- **Revised Whisper caption handling**, including fresh blocks after pauses and immediate clearing when you pause, seek, or change channels.

The same changes are shared by Windows, both Mac builds, Debian, Arch, and Fedora. See the [controls guide](docs/CONTROLS.md) for the new defaults and assignments.

## Updates and help

To update, quit the app and install the newer download from [Releases](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases). There's no automatic updater yet. The setup guides also cover uninstalling.

If something breaks, [open an issue](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues) with your operating system, app version, and what happened. For caption problems, include the engine and recognition speed.

Want to check installer download counts? There's a [short guide](docs/DOWNLOADS.md). Want to build or change the app? Start with [development setup](docs/DEVELOPMENT.md).

## About this app

Spelunkr Desktop isn't affiliated with or endorsed by Spelunkr or the Internet Archive. Their website, names, artwork, and videos belong to their respective owners.

The app doesn't host videos, save audio or caption transcripts, or add analytics. Preferences and website storage stay on your computer. The live website makes its own network requests.

The app's code and original icon use the [MIT license](LICENSE). Speech and capture components have their own [licenses and credits](native/WHISPER-NOTICES.md).
