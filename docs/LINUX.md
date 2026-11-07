# Installing on Linux

The Linux packages are for **64-bit Intel and AMD PCs**. Choose your distribution below. You'll need an internet connection to watch.

## Debian

For **Debian 12 or newer**, [download the .deb](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Debian-amd64.deb). Open a terminal in the folder where you saved it and run:

```sh
sudo apt install ./Spelunkr-Desktop-0.7.0-Debian-amd64.deb
```

## Arch Linux

[Download the Arch package](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Arch-x64.pkg.tar.xz), update Arch, and install the file:

```sh
sudo pacman -Syu
sudo pacman -U ./Spelunkr-Desktop-0.7.0-Arch-x64.pkg.tar.xz
```

Run the install command from the download folder. This package is distributed through GitHub Releases; it isn't an AUR package.

## Fedora

For **Fedora Workstation 43 or newer**, [download the .rpm](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/download/v0.7.0/Spelunkr-Desktop-0.7.0-Fedora-x86_64.rpm). From the download folder, run:

```sh
sudo dnf install ./Spelunkr-Desktop-0.7.0-Fedora-x86_64.rpm
```

All three package managers install the declared dependencies. Open **Spelunkr Desktop** from your applications menu when installation finishes. The packages aren't signed; SHA-256 checksums are on the [release page](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.7.0).

## Watching and captions

Use **Up / Down** for channels and **Left / Right** for volume, in windowed and fullscreen views. **F11** uses video fullscreen; Escape or Exit fullscreen returns to the window. **Settings → Controls…** lets you assign keys and controller inputs, then Save them together.

**Ctrl+Shift+L** toggles captions while the app has focus. Turning them on rewinds 15 seconds once and pauses to recognize a cache ahead of playback. The picture resumes when at least 15 seconds are ready. Captions start off.

Whisper and its English models are included. Faster recognition is the default; Balanced is available for the larger model. You don't need Python or a speech-service account to use the installed app. The [caption guide](CAPTIONS.md) covers color, size, pause clearing, and recognition settings.

## Sound setup

Built-in captions read the channel's media file directly. They don't need a speaker-monitor source or microphone permission, and they still work with the player muted.

Normal playback still needs your desktop's sound system. If you're setting up Arch without an existing audio server, follow the [Arch PipeWire guide](https://wiki.archlinux.org/title/PipeWire) for your desktop. The packages retain PulseAudio client utilities for compatibility; they don't replace your sound server.

For caption preparation problems, check the connection to Internet Archive and try Faster recognition. Speech from other applications isn't used by the built-in caption cache.

## Always on top

The app disables **View → Always on top** when a Wayland session is detected. Some desktops offer their own **Keep Above** window action. On X11, the app's shortcut is **Ctrl+Shift+T**.

## Update or uninstall

To update, quit the app and install the newer package using the same command with its new filename. There's no automatic updater.

To remove it, use the command for your distribution:

```sh
# Debian
sudo apt remove spelunkr-desktop-unofficial
# Arch
sudo pacman -R spelunkr-desktop-unofficial
# Fedora
sudo dnf remove spelunkr-desktop-unofficial
```

Preferences and website storage stay in `~/.config/Spelunkr Desktop/`.

Package installation, speaker-monitor captions, process cleanup, and X11 startup were checked in Debian 13, Fedora 43, and current Arch containers. Debian 12 is a compatibility target, not a separately tested installation. See [testing notes](TESTING.md) for details.

[Back to downloads](../README.md#download)
