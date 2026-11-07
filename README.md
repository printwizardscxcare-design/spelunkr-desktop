# Spelunkr Desktop

I really just wanted ok subtitles, and something separate from my browser, but then I kept adding stuff. Here you go:

An unofficial desktop app for [spelunkr.tv](https://spelunkr.tv/). Pick a channel, put the video fullscreen, and turn on captions when you need them.

The channels and shows come from the live website. The app gives them their own window and adds English captions that run on your computer.

**[Download the Windows installer](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Windows-x64-Setup.exe)** · **[All downloads](#download)** · **[Help with captions](docs/CAPTIONS.md)** · **[Report a problem](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues)**

## Download

The current download is **[0.7.0, a preview](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.7.0)**. You don't need a GitHub account to download it. Watching needs an internet connection.

There's also **[0.8.0 Beta 1](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.8.0-beta.1)** with [audio settings](docs/AUDIO.md): normalization, a denoiser slider, compression and makeup gain, Pre EQ / Post EQ, a ten-band EQ, and saved classic or personal presets. Optional subtitle-only cleanup has its own unheard feed. The five-second subtitle cooldown after tuning is included too.

| Version | Windows | All platforms |
| --- | --- | --- |
| Current · 0.7.0 | [Download installer](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Windows-x64-Setup.exe) | [Current downloads](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.7.0) |
| Beta · 0.8.0-beta.1 | [Download beta installer](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.8.0-beta.1/Spelunkr-Desktop-0.8.0-beta.1-Windows-x64-Setup.exe) | [Beta downloads](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.8.0-beta.1) |

Both versions are available for the computers listed below. The beta installs over an existing copy; you can switch back by quitting and reinstalling 0.7.0. There is no automatic updater. New 0.8 changes will stay in the beta until a regular release is ready.

The links below are for **0.7.0**. Use **Beta downloads** above for the newer test version.

| Your computer | Download | Setup guide |
| --- | --- | --- |
| Windows 10 or 11 · Intel/AMD 64-bit | [Windows installer (.exe)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Windows-x64-Setup.exe) | [Windows](docs/WINDOWS.md) |
| Mac · Apple M-series chip · macOS 14.2+ | [Apple Silicon (.dmg)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Mac-arm64.dmg) | [Mac](docs/MAC.md) |
| Mac · Intel processor · macOS 14.2+ | [Intel Mac (.dmg)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Mac-x64.dmg) | [Mac](docs/MAC.md) |
| Debian 12+ · Intel/AMD 64-bit | [Debian (.deb)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Debian-amd64.deb) | [Debian](docs/LINUX.md#debian) |
| Arch Linux · Intel/AMD 64-bit | [Arch (.pkg.tar.xz)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Arch-x64.pkg.tar.xz) | [Arch](docs/LINUX.md#arch-linux) |
| Fedora Workstation 43+ · Intel/AMD 64-bit | [Fedora (.rpm)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Fedora-x86_64.rpm) | [Fedora](docs/LINUX.md#fedora) |

Not sure which Mac download to choose? Open **Apple menu → About This Mac**. “Chip” followed by an Apple M-series name means Apple Silicon; “Processor” followed by Intel means Intel.

## Install and start watching

**Windows:** Open the downloaded `.exe`, follow the installer, then launch **Spelunkr Desktop (Unofficial)** from Start or your desktop shortcut. It installs for your account without administrator access.

**Mac:** Open the `.dmg`, drag **Spelunkr Desktop** into **Applications**, then open it from there.

**Linux:** Download your distribution's package and install it from the download folder:

```sh
# Debian
sudo apt install ./Spelunkr-Desktop-0.7.0-Debian-amd64.deb

# Arch — update your system first
sudo pacman -Syu
sudo pacman -U ./Spelunkr-Desktop-0.7.0-Arch-x64.pkg.tar.xz

# Fedora
sudo dnf install ./Spelunkr-Desktop-0.7.0-Fedora-x86_64.rpm
```

Then open **Spelunkr Desktop** from your applications menu. The [Linux guide](docs/LINUX.md) covers setup and updates.

Use the installer for your computer, rather than GitHub's **Source code** ZIP. Windows installers are unsigned, and Mac builds aren't notarized by Apple, so first-launch prompts are possible. See the setup guide for your platform. File checksums are on the [release page](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.7.0).

## Turn on captions

Click the app, then press **Ctrl+Shift+L** on Windows/Linux or **Command+Shift+L** on Mac. You can also use **Captions → In-app live captions**. Captions start off; the same shortcut turns them off again. Turning them on rewinds 15 seconds once and pauses while subtitles are prepared ahead of playback. A slow connection can make initial preparation take longer than 15 seconds.

Whisper and both English speech models come with the installer. There's no speech account, subscription, or separate model download. Recognition runs locally and reads the channel file directly. Other apps and your microphone are not used, and captions still work with the player muted.

The **Captions** menu lets you choose:

- **White or yellow text**, with a transparent background.
- **Five text sizes**, with wider two-line blocks in video fullscreen.
- **Faster or Balanced recognition.** Faster is the default; Balanced uses the larger model.
- **Windows Live Captions** as an optional alternative on Windows 11 22H2 or newer. Whisper also works on Windows 10.

Whisper sometimes gets words or timing wrong, especially on noisy recordings. See the [testing notes](docs/TESTING.md) for what's been checked so far.

The [caption guide](docs/CAPTIONS.md) covers settings and troubleshooting, including subtitle delay and pause handling.

## New in 0.7.0

The biggest change is how captions catch up with the video. Whisper now works ahead and keeps 15 seconds of subtitles ready before playback resumes. Captions follow the video when you pause or skip, and you can add up to 10 seconds of subtitle delay if needed.

The controls got some attention too:

- **Up/Down changes channels; Left/Right adjusts volume.** Both work in the window and fullscreen.
- **Settings → Controls** lets you assign keys or controller inputs. Click Assign, press the control you want, and Save when you're done.
- **Fullscreen works the same** from the menu, shortcut, or video button. Press Escape or click Exit fullscreen to leave.
- **Captions start off.** Choose None or use the caption shortcut to turn them off again.

0.7.0 is available for Windows, Intel and Apple Silicon Macs, Debian, Arch, and Fedora. The [controls guide](docs/CONTROLS.md) has the full shortcut list.

## Updates and help

To update, quit the app and install the newer download from [Releases](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases). There's no automatic updater yet. The setup guides also cover uninstalling.

If something breaks, [open an issue](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues) with your operating system, app version, and what happened. For caption problems, include the engine and recognition speed.

Want to check installer download counts? There's a [short guide](docs/DOWNLOADS.md). Want to build or change the app? Start with [development setup](docs/DEVELOPMENT.md).

## About this app

Spelunkr Desktop isn't affiliated with or endorsed by Spelunkr or the Internet Archive. Their website, names, artwork, and videos belong to their respective owners.

The app doesn't host videos, save audio or caption transcripts, or add analytics. Preferences and website storage stay on your computer. The live website makes its own network requests.

The app's code and original icon use the [MIT license](LICENSE). Speech and capture components have their own [licenses and credits](native/WHISPER-NOTICES.md).
