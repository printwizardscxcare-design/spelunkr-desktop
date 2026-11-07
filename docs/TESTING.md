# What's been tested

Version **0.6.0 is a preview**. The automated checks cover the app's logic, packaged speech models, and several installation paths. They don't cover every desktop, sound device, or recording.

## Checks for 0.6.0

| Platform | Checked | Still needs a manual check |
| --- | --- | --- |
| Windows x64 | App-logic tests; packaged Whisper base/tiny models; streaming recognition, silence handling, and process shutdown. | A separate Windows 10 hardware test and live speaker capture across different output devices. |
| Intel and Apple Silicon Mac | App signature and startup; DMGs mounted on clean runners; both models and streaming speech detection; capture helper starts with its help command. | Live speaker capture, the first-use audio-permission prompt, and different physical output devices. |
| Debian 13, Fedora 43, current Arch | Package installation; speaker-monitor recognition through the app's capture bridge; idle-audio handling; process cleanup; startup under a virtual X11 display. | Full playback on physical desktops, Wayland behavior, and different sound devices. Debian 12 is a compatibility target but wasn't installed separately for these checks. |

The packaged speech checks feed recorded speech and silent PCM into the actual helper. They check that both models load, silence doesn't invent captions in that test, speech produces text, and closing the input stops recognition. Timing measurements use the build computer; they aren't a prediction for every user's PC.

The JavaScript tests cover fullscreen channel arrows, two-line caption blocks, pause clearing, size and color settings, URL restrictions, window state, and capture-process cleanup.

Run records: [Windows build](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42344144335), [Linux package recheck](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42345511438), and [clean Mac installer checks](https://github.com/printwizardscxcare-design/spelunkr-desktop/actions/runs/42345215264). These links need repository access.

## Known limits

- Bundled Whisper models recognize English. Recognition can be wrong and arrives with a delay.
- **Mac live audio capture and its permission flow still need a physical-Mac test.** Passing model and installer checks doesn't verify that flow.
- Windows installers are unsigned. Mac previews are signed ad hoc but aren't notarized by Apple.
- The app disables always-on-top controls when it detects a Linux Wayland session.
- Playback, channel availability, and website sign-in depend on the live Spelunkr site.

## Reporting a problem

[Open an issue](https://github.com/printwizardscxcare-design/spelunkr-desktop/issues) with the app version, operating system, what you expected, and what happened. For captions, include the engine and speed setting, whether other apps were playing sound, and whether you recently changed your output device.

For the controls and common fixes, see the [caption guide](CAPTIONS.md) or your platform's setup page: [Windows](WINDOWS.md), [Mac](MAC.md), or [Linux](LINUX.md).
