# Installing on Linux

The Linux build is for **64-bit Intel and AMD PCs**. Download the package for your
distribution from [Releases](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.5.0).
The repository is private, so you need a GitHub account with access.

## Debian

For Debian 12 or newer, download `Spelunkr-Desktop-0.5.0-Debian-x64.deb`, open a
terminal in your Downloads folder, and run:

```sh
sudo apt install ./Spelunkr-Desktop-0.5.0-Debian-x64.deb
```

## Arch Linux

Update Arch first, then install the downloaded package:

```sh
sudo pacman -Syu
sudo pacman -U ./Spelunkr-Desktop-0.5.0-Arch-x64.pkg.tar.xz
```

This is a release download, not an AUR package. The package manager installs the
app's dependencies from Arch's repositories.

## Fedora

For Fedora Workstation 43 or newer, download `Spelunkr-Desktop-0.5.0-Fedora-x64.rpm`
and run:

```sh
sudo dnf install ./Spelunkr-Desktop-0.5.0-Fedora-x64.rpm
```

On all three, open **Spelunkr Desktop** from your applications menu. These commands
also work for updates with the new version's filename. Packages aren't signed yet;
SHA-256 checksums are provided with each release.

## Watching and captions

Press **F11** for fullscreen, then **Up / Down** to change channels. Press
**Ctrl+Shift+L** to turn captions on. Under **Captions**, choose white or yellow text
and a size. Text has a transparent background, uses blocks of up to two lines,
clears during pauses, and adjusts to the fullscreen picture.

Linux uses **Vosk**, with a small English speech model included in the download.
Recognition runs on your computer. No separate Python installation, speech account,
model download, or cloud subscription is needed. Its accuracy and language support
differ from Windows Live Captions; this first Linux release supports English.

Captions listen to your **default speaker output**, including other applications.
They do not select a microphone or save audio or transcripts. After changing
speakers or headphones, turn captions off and on to reconnect to the new output.

Your desktop must have **PulseAudio** or **PipeWire with PulseAudio compatibility**
running. The installer includes the dependency that supplies the `parec` capture
utility (`pulseaudio-utils` on Debian/Fedora, `libpulse` on Arch). Installing that
utility does not replace your sound server. On an Arch setup without a sound
server, configure PipeWire and `pipewire-pulse` using Arch's audio setup guide.

If captions fail, check sound playback, toggle captions, and check the error under
the Captions menu. To check the speaker monitor independently, run:

```sh
pactl get-default-sink
pactl list short sources
```

The second command should include a monitor for your output. Recognition quality
depends on the speech and background sound; pauses are inferred from text updates.

## Window-manager differences

Fullscreen, channel arrows, and the caption overlay work through the app. **Always
on top is unavailable in native Wayland sessions** and its menu entry is disabled
when a Wayland session is detected. Some desktops offer their own “Keep Above”
window action. On X11, use **Ctrl+Shift+T**.

## Removing the app

```sh
# Debian
sudo apt remove spelunkr-desktop-unofficial
# Arch
sudo pacman -R spelunkr-desktop-unofficial
# Fedora
sudo dnf remove spelunkr-desktop-unofficial
```

Preferences remain in `~/.config/Spelunkr Desktop/`.

## Validation

The Linux workflow installs the real packages in Debian 13, Fedora 43, and current
Arch containers. It checks local speech recognition, speaker-monitor capture,
caption-process cleanup, and application startup with a virtual X11 display.
These checks do not replace watching video on a physical desktop or testing every
Wayland compositor and sound-device combination. Debian 12 is a compatibility
target; the package installation check uses Debian 13.
