# What's been tested

Version **0.7.0 is a preview**. Checks cover app logic, timestamped speech recognition, audio cleanup, and installer paths. They don't cover every desktop or recording.

## Checks for 0.7.0

All 86 JavaScript checks pass locally. They include saved keyboard/controller assignments, cancelled drafts, the 15-second recognition gate, bounded audio read-ahead, video-clock subtitle selection, source/frame restrictions, source changes, resume corrections, pause clearing, subtitle delay, and clean shutdown. Windows, Mac, and Linux run the same fullscreen and caption-cache code.

The Windows source build was checked on screen with live Spelunkr playback: menu/F11 video fullscreen, Exit/Escape, cached captions appearing and clearing, timeline seeks and cache replacement, pause clearing, volume changes, and turning captions off with both native processes confirmed stopped. The Controls window was checked for its matching appearance, saving F8 for next channel, reopening to verify the saved assignment, and restoring the requested arrow defaults. A physical gamepad hasn't been tested.

The new native runtime passed its C++ regression checks and a timestamped recorded-speech test in [this build](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42382051436). It prepared 17 seconds of speech and silence in about 2.4 seconds on the local Windows PC. This is one fixture, not a speed guarantee. A separate regression check reproduces DC-biased tape audio and verifies cleanup preserves speech energy and sample duration.

Final platform installer and clean-Mac checks are run before publication. Run links and final results are added here when those checks finish.

## Checks for 0.6.0

| Platform | Checked | Still needs a manual check |
| --- | --- | --- |
| Windows x64 | App-logic tests; packaged Whisper base/tiny models; streaming recognition, silence handling, and process shutdown. | A separate Windows 10 hardware test and live speaker capture across different output devices. |
| Intel and Apple Silicon Mac | App signature and startup; DMGs mounted on clean runners; both models and streaming speech detection; capture helper starts with its help command. | Live speaker capture, the first-use audio-permission prompt, and different physical output devices. |
| Debian 13, Fedora 43, current Arch | Package installation; speaker-monitor recognition through the app's capture bridge; idle-audio handling; process cleanup; startup under a virtual X11 display. | Full playback on physical desktops, Wayland behavior, and different sound devices. Debian 12 is a compatibility target but wasn't installed separately for these checks. |

The packaged speech checks feed recorded speech and silent PCM into the actual helper. They check that both models load, silence doesn't invent captions in that test, speech produces text, and closing the input stops recognition. Timing measurements use the build computer; they aren't a prediction for every user's PC.

The JavaScript tests cover fullscreen channel arrows, two-line caption blocks, pause clearing, size and color settings, URL restrictions, window state, and capture-process cleanup.

Run records: [Windows build](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42344144335), [Linux package recheck](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42345511438), and [clean Mac installer checks](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42345215264).

## Known limits

- Bundled Whisper models recognize English. Recognition can be wrong and arrives with a delay.
- Full viewing on physical Macs and physical gamepad hardware haven't been tested. Buffered Whisper captions read the channel file and don't use the old system-audio permission path.
- Windows installers are unsigned. Mac previews are signed ad hoc but aren't notarized by Apple.
- The app disables always-on-top controls when it detects a Linux Wayland session.
- Playback, channel availability, and website sign-in depend on the live Spelunkr site.

## Reporting a problem

[Open an issue](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues) with the app version, operating system, what you expected, and what happened. For captions, include the engine and speed setting, whether other apps were playing sound, and whether you recently changed your output device.

For the controls and common fixes, see the [caption guide](CAPTIONS.md) or your platform's setup page: [Windows](WINDOWS.md), [Mac](MAC.md), or [Linux](LINUX.md).
