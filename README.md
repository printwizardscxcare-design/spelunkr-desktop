# Spelunkr Desktop

I really just wanted ok subtitles, and something separate from my browser, but then I kept adding stuff. Here you go:

An unofficial desktop app for [spelunkr.tv](https://spelunkr.tv/). Pick a channel, put the video fullscreen, and turn on captions when you need them.

The channels and shows come from the live website. The app gives them their own window and adds English captions that run on your computer.

**The new beta is undergoing installer checks.** The links below will become active after publication. Until then, the [existing beta is available here](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.8.0-beta.1).

**[Download the Windows beta](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.8.0-beta.2/Spelunkr-Desktop-0.8.0-beta.2-Windows-x64-Setup.exe)** · **[All beta downloads](#download)** · **[Caption help](docs/CAPTIONS.md)** · **[Report a problem](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues)**

## Download

**0.8.0-beta.2 will become the only public release after installer checks finish.** It is a beta while improvements continue. Quit the app before installing an update; there is no automatic updater.

**Captions start on, using built-in Whisper.** Choose a channel and the app prepares subtitles automatically. The speech engine and English models are included—no speech account, model download, microphone setup, or engine selection. Watching needs an internet connection.

| Your computer | Download | Setup guide |
| --- | --- | --- |
| Windows 10 or 11 · Intel/AMD 64-bit | [Windows installer (.exe)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.8.0-beta.2/Spelunkr-Desktop-0.8.0-beta.2-Windows-x64-Setup.exe) | [Windows](docs/WINDOWS.md) |
| Mac · Apple M-series · macOS 14.2+ | [Apple Silicon (.dmg)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.8.0-beta.2/Spelunkr-Desktop-0.8.0-beta.2-Mac-arm64.dmg) | [Mac](docs/MAC.md) |
| Mac · Intel · macOS 14.2+ | [Intel Mac (.dmg)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.8.0-beta.2/Spelunkr-Desktop-0.8.0-beta.2-Mac-x64.dmg) | [Mac](docs/MAC.md) |
| Debian 12+ · Intel/AMD 64-bit | [Debian (.deb)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.8.0-beta.2/Spelunkr-Desktop-0.8.0-beta.2-Debian-amd64.deb) | [Debian](docs/LINUX.md#debian) |
| Arch Linux · Intel/AMD 64-bit | [Arch (.pkg.tar.xz)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.8.0-beta.2/Spelunkr-Desktop-0.8.0-beta.2-Arch-x64.pkg.tar.xz) | [Arch](docs/LINUX.md#arch-linux) |
| Fedora Workstation 43+ · Intel/AMD 64-bit | [Fedora (.rpm)](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.8.0-beta.2/Spelunkr-Desktop-0.8.0-beta.2-Fedora-x86_64.rpm) | [Fedora](docs/LINUX.md#fedora) |

Not sure which Mac download to choose? **Apple menu → About This Mac** lists either an Apple M-series chip or an Intel processor.

## Install and start watching

**Windows:** Open the downloaded `.exe`, follow the installer, then launch **Spelunkr Desktop (Unofficial)** from Start or your desktop shortcut. It installs for your account without administrator access.

**Mac:** Open the `.dmg`, drag **Spelunkr Desktop** into **Applications**, then open it from there.

**Linux:** Download your distribution's package and install it from the download folder:

**Debian**

```sh
sudo apt install ./Spelunkr-Desktop-0.8.0-beta.2-Debian-amd64.deb
```

**Arch — update your system first:**

```sh
sudo pacman -Syu
```

Then install the package:

```sh
sudo pacman -U ./Spelunkr-Desktop-0.8.0-beta.2-Arch-x64.pkg.tar.xz
```

**Fedora**

```sh
sudo dnf install ./Spelunkr-Desktop-0.8.0-beta.2-Fedora-x86_64.rpm
```

Then open **Spelunkr Desktop** from your applications menu. The [Linux guide](docs/LINUX.md) covers setup and updates.

Use the installer for your computer, rather than GitHub's **Source code** ZIP. Windows installers are unsigned, and Mac builds aren't notarized by Apple, so first-launch prompts are possible. See the setup guide for your platform. File checksums are on the [release page](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.8.0-beta.2).

## Captions work automatically

Captions are **on by default**, using **Built-in captions (Whisper)**. Use **Captions → On / Off** to switch them, or press **Ctrl+Shift+L** on Windows/Linux or **Command+Shift+L** on Mac. The engine menu selects the recognizer separately; it has no None option. Your choices are saved. The app briefly pauses to prepare subtitles ahead of playback; slow connections can take longer.

Whisper and both English speech models come with the installer. There's no speech account, subscription, or separate model download. Recognition runs locally and reads the channel file directly. Other apps and your microphone are not used, and captions still work with the player muted.

The **Captions** menu lets you choose:

- **White or yellow text**, with a transparent background.
- **Five text sizes**, with wider two-line blocks in video fullscreen.
- **Faster or Balanced recognition.** Faster is the default; Balanced uses the larger model.
- **Windows Live Captions** as an optional alternative on Windows 11 22H2 or newer. Whisper also works on Windows 10.

Whisper sometimes gets words or timing wrong, especially on noisy recordings. See the [testing notes](docs/TESTING.md) for what's been checked so far.

The [caption guide](docs/CAPTIONS.md) covers settings and troubleshooting, including subtitle delay and pause handling.

## New in 0.8.0-beta.2

- Captions start automatically with Whisper, including after upgrading from the older manual-setup versions. On/Off is separate from engine selection.
- Interrupted subtitle connections retry automatically while the picture keeps playing.
- Audio processing fades hard starts and stops, removes low-frequency recording offsets, and avoids abrupt gain resets.
- Normalization keeps ordinary programs louder and lets the output limiter handle brief peaks.
- The five-second subtitle cooldown still starts after channel tuning finishes. Settings can shorten it, turn it off, or extend it to 30 seconds.

## Updates and help

To update, quit the app and install the newer download from [Releases](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases). There's no automatic updater yet. The setup guides also cover uninstalling.

If something breaks, [open an issue](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues) with your operating system, app version, and what happened. For caption problems, include the engine and recognition speed.

Want to check installer download counts? There's a [short guide](docs/DOWNLOADS.md). Want to build or change the app? Start with [development setup](docs/DEVELOPMENT.md).

## About this app

Spelunkr Desktop isn't affiliated with or endorsed by Spelunkr or the Internet Archive. Their website, names, artwork, and videos belong to their respective owners.

The app doesn't host videos, save audio or caption transcripts, or add analytics. Preferences and website storage stay on your computer. The live website makes its own network requests.

The app's code and original icon use the [MIT license](LICENSE). Speech and capture components have their own [licenses and credits](native/WHISPER-NOTICES.md).
