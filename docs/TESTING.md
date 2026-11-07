# Testing notes

0.7.0 is a preview. It has been used with live Spelunkr playback on Windows and put through automated installer and caption tests on all supported platforms. There are still gaps, listed below.

## What was checked

On Windows, manual checks covered channel and volume keys, fullscreen and Escape, saving a custom shortcut, and restoring the defaults. Caption checks covered turning them on and off, pausing, skipping through a video, clearing text during silence, and saving a timing adjustment. Turning captions off also stopped the recognition processes.

The Windows installer was downloaded, checked against its SHA-256 hash, and installed over 0.6.0. The installed app reports 0.7.0, and its bundled caption reader passed a recorded-speech test.

All 86 JavaScript tests passed. They cover saved controls, subtitle timing and layout, the 15-second buffer, channel changes, pause and seek handling, shutdown, and restrictions on which pages can control the app.

Speech tests use recorded speech and silence with the bundled models. They check that words have timestamps, silence clears correctly, and the reader shuts down. An audio-cleanup test checks that removing a recording's DC offset preserves its duration and speech energy. One Windows test prepared 17 seconds of speech and silence in about 2.4 seconds; performance will vary by computer and recording.

## Installer results

All six platform packages were built from the same application source. File hashes were checked before publication.

| Platform | Checks |
| --- | --- |
| Windows x64 | Installer build, local upgrade, live playback, and bundled caption reader. |
| Intel and Apple Silicon Mac | DMG mounting, app signatures, startup, both speech models, and buffered recognition on clean build runners. |
| Debian 13, Arch, Fedora 43 | Package installation, buffered recognition, silence handling, process cleanup, and startup under a virtual X11 display. |

Build records: [Windows](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42384601206), [Mac](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42384605852), [Linux](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42384603528), [Linux installer recheck](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42386122933), [clean Mac installer checks](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42386125479), [native caption tests](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42382051436), and [publication](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42386464281).

The first Linux run failed a test for the old speaker-capture method. The same installer files then passed the linked recheck, which tests the buffered caption reader used in 0.7.0.

## What still needs testing

- A separate Windows 10 machine.
- Full viewing sessions on physical Intel and Apple Silicon Macs. The Mac checks above are automated.
- Physical gamepads. Controller handling has automated tests, but hasn't been tried with a controller in hand.
- Playback on physical Linux desktops, including Wayland and different sound setups. Debian 12 is a compatibility target; the Debian installation test used 13.

## Known limits

Whisper recognizes English and can get words or timing wrong. Older recordings, background music, and overlapping voices can make that worse.

Windows installers are unsigned. Mac builds use an ad-hoc signature and aren't notarized by Apple. Always on top is disabled on Linux Wayland. Channels, playback, and sign-in depend on the live Spelunkr website.

## Report a problem

[Open an issue](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues) with your operating system, app version, and what happened. For captions, include the engine, recognition speed, delay setting, and whether the problem followed a pause, seek, or channel change. If you're using Windows Live Captions, mention any recent sound-device change too.

[Caption help](CAPTIONS.md) · [Windows setup](WINDOWS.md) · [Mac setup](MAC.md) · [Linux setup](LINUX.md)
