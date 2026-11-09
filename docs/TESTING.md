# Testing notes

0.8.0-beta.2 is a beta. Captions were checked with a fresh Windows app profile using the downloaded installer's application files and speech tools. Choosing a channel was enough: Whisper prepared its buffer, resumed playback, and displayed spoken text without opening caption settings or downloading a model.

## App and audio checks

All **113 JavaScript tests** passed. They cover automatic Whisper startup on Windows, Mac, and Linux; upgrading older preferences; separate engine and On/Off choices; saved Off preferences; automatic subtitle retries; caption timing, buffering, channel changes, and shutdown; controls; and access restrictions.

Chromium audio checks use real Web Audio rendering. They verify short fades at hard starts/stops at 44.1 and 48 kHz, retained dialogue from a surround center channel, effect order, media-volume handling, graph suspension/resume, and settings/preset persistence. Normalization tests check ordinary program levels, louder material, silence, and isolated peaks. These are waveform and recorded-speech checks rather than listening tests on every sound device.

Both bundled English models passed recorded-speech checks. The packaged audio reader and recognizer also passed timestamped read-ahead, silence, DC removal, HTTPS-support, and process-cleanup checks.

## Installer results

All installers use the same application source commit. Packaged checksums were verified before publication.

| Platform | Checks |
| --- | --- |
| Windows x64 | Downloaded installer checksum, bundled speech tools and models, and automatic live captions with a fresh profile. |
| Intel Mac | DMG mounting, signatures, packaged models, buffered recognition, and startup on a clean macOS 15 runner. |
| Apple Silicon Mac | Built and checked on macOS 15; downloaded DMG, signatures, packaged models, buffered recognition, and startup checked on a clean macOS 26 runner. |
| Debian 13, Arch, Fedora 43 | Package installation, buffered recognition, silence handling, process cleanup, and startup under a virtual X11 display. |

Build records: [Windows](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42656563100), [Mac](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42656563027), [Linux](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42656563083), and [downloaded Mac installer checks](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42660761231).

## Remaining coverage and limits

A separate Windows 10 machine, physical gamepads, and extended viewing sessions on physical Mac and Linux desktops still need coverage. Debian 12 is a compatibility target; installation checks used Debian 13. Wayland and different sound-device setups need physical-desktop testing.

Whisper recognizes English and can get words or timing wrong, especially with noisy recordings or overlapping voices. Watching depends on the live Spelunkr website and an internet connection. Windows installers are unsigned; Mac builds are ad-hoc signed and not notarized. The setup guides cover operating-system installation prompts.

[Report a problem](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues) with the app version, operating system, and what happened. For captions, include the engine, recognition speed, and whether the problem followed a pause, seek, or channel change.

[Caption help](CAPTIONS.md) · [Windows setup](WINDOWS.md) · [Mac setup](MAC.md) · [Linux setup](LINUX.md)
