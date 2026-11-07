# Using captions

Click the app, then press **Ctrl+Shift+L** on Windows/Linux or **Command+Shift+L** on Mac. You can also use **Captions → In-app live captions**.

Under **Captions → Caption engine**, choose **Built-in captions (Whisper)** to turn captions on, or **None** to turn them off. None clears the text and stops audio capture and recognition. The shortcut toggles your last-used engine, and the menu selection follows it. Captions start off when you open the app.

Turning built-in captions on rewinds the video **15 seconds** and prepares a caption cache ahead of playback. The picture pauses with **Preparing subtitles…** until recognition has covered at least 15 seconds ahead, then resumes. Captions are displayed by their video timestamps, rather than whenever recognition finishes. A slow connection can make initial preparation take longer than 15 seconds.

The rewind happens once when captions go from off to on. Speed changes and channel switches prepare a fresh cache without another rewind. If recognition falls behind, playback pauses to refill the cache instead of showing increasingly late subtitles.

The default engine is Whisper. It recognizes English speech on your computer, using models included in the installer. It doesn't need a speech account or send audio to a speech service. Watching channels still needs an internet connection.

## Subtitle cooldown (0.8 beta)

In the [0.8 beta](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.8.0-beta.1), **Captions → Subtitle cooldown** gives you time to browse channels before loading subtitles. It waits for tuning to finish, then counts down near the bottom-right of the video. Each channel change cancels the old wait and starts a fresh one after the new channel tunes in.

The default is **5 seconds**. Choose a preset or use the one-second adjustments for any value up to **30 seconds**, or choose **Off**. Your choice is saved. Once the countdown ends, Whisper prepares its separate 15-second subtitle buffer. Turning captions on initially still prepares them right away; pausing or seeking within the same channel doesn't start the cooldown.

This setting isn't in 0.7.0. Both the current version and beta are available on the [download page](../README.md#download).

## Separate subtitle audio (audio update)

Listening effects never change Whisper's input: it reads the channel file separately. **Audio → Audio settings → Subtitle audio cleanup** optionally adds gentle denoising and speech-focused filtering to that unheard feed. The setting is off by default and is independent of listening presets. It preserves audio duration; changing it rebuilds the subtitle buffer. A noisy test sample retained speech but showed no wording improvement, so compare on your channel. It does not affect Windows Live Captions. See [Audio help](AUDIO.md).

## Appearance

Use **Captions → Text color** for white or yellow text. **Text size** has five choices: 80%, 100%, 125%, 150%, and 200%. The app remembers these settings.

Captions have a transparent background and a dark text shadow for readability. They fill up to two lines and then start a new block. In fullscreen, text can use more of the picture's width. Changing size or resizing the window adjusts how many words fit.

Each cached subtitle has a start and end time in the video. Silence between cues leaves the picture clear. Pausing playback clears the overlay; resuming uses the current video time. Seeking or changing channels discards the old cache and prepares subtitles for the new position. Old results from an earlier channel can't reappear.

## Subtitle timing

Use **Captions → Subtitle delay** to add time before text appears. Choose a preset or adjust it in **0.1-second** steps, from **0 to 10 seconds**. The setting is saved. You can assign delay adjustments to keys or controller buttons in Settings → Controls.

Text and its clearing shift together. Turning captions off stops the audio reader and recognition processes and clears their in-memory cache. Pausing leaves the cache ready for resume; seeking and channel changes replace it. None of these actions adds another automatic rewind.

Leave delay at zero to use the recognized video timestamps. Increase it if a recording's subtitles appear early. The adjustment is separate from the 15-second recognition cache.

## Recognition speed

**Captions → Recognition speed** has two options:

| Setting | Model | When to use it |
| --- | --- | --- |
| Faster, the default | Whisper tiny English | Start here for shorter delays, especially on older computers. |
| Balanced | Whisper base English | Try the larger model if you want to compare recognition and your computer can keep up. |

Whisper processes the channel's audio ahead of the picture and supplies timestamps for complete subtitle cues. Faster mode uses the smaller model so the cache can fill sooner. The larger Balanced model takes more processing time; it isn't a guarantee of better results for every recording. If playback keeps pausing to prepare subtitles in Balanced mode, switch back to Faster.

The app remembers your choice. Recognition speed and text size are separate settings.

## What audio is used

Built-in Whisper captions read the channel's Internet Archive media file directly. They work with the player muted and don't pick up other programs or your microphone. Audio and subtitle text stay in memory and aren't saved.

Old tape recordings can have an audio offset that interferes with speech detection. The audio reader removes that offset before recognition while preserving the audio's duration and video clock.

## Windows Live Captions

On **Windows 11 22H2 or newer**, you can choose **Captions → Caption engine → Windows Live Captions (Windows 11)**. This is an alternative to Whisper, and uses Windows' speech settings. Windows may ask you to download speech files the first time.

This optional engine uses live system audio, including other apps. Its captions aren't prepared by the built-in read-ahead cache, so their timing depends on Windows.

The app reads text from the Windows caption window and minimizes that window while displaying the text over the video. When stopped, it restores a window that was already open, or closes one it started. Use **Captions → Open Windows caption window** for setup or troubleshooting. Windows' own shortcut is **Windows+Ctrl+L**; the app's shortcut is **Ctrl+Shift+L**.

To return to Whisper, choose **Caption engine → Built-in captions (Whisper)**. Windows Live Captions isn't available on Windows 10; use Whisper there.

A channel's own CC or subtitle tracks, when available, are separate from these generated captions.

## Troubleshooting

- **The shortcut does nothing:** click the app first, or use the Captions menu. Shortcuts aren't global.
- **There is no text:** check that captions are enabled and speech is playing. Recognition needs a moment to produce the first block. The Captions menu shows the connection status or an error.
- **Preparing subtitles takes a long time:** the app needs to read the channel file and recognize 15 seconds ahead. Try Faster mode and check the connection. Large Archive files can take a while to seek.
- **Text appears early:** adjust Subtitle delay. Recognition timestamps are estimates and can be imperfect.
- **The picture pauses repeatedly:** try Faster mode. The app pauses to keep captions synchronized when the cache runs low.
- **Speech from another program appears:** check whether Windows Live Captions is selected. Built-in buffered captions use only the channel file.
- **Mac captions won't start:** see the [Mac setup guide](MAC.md).
- **Linux captions won't start:** see the [Linux setup guide](LINUX.md).
- **The Windows caption window isn't connecting:** finish Windows' first-use setup, then toggle captions again. You can use Whisper while troubleshooting the Windows engine.

See [what's been tested](TESTING.md) for platform limits. If you report an issue, include your operating system, app version, caption engine, and recognition speed.

[Back to the app guide](../README.md)
