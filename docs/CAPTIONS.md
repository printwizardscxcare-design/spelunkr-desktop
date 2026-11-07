# Using captions

Click the app, then press **Ctrl+Shift+L** on Windows/Linux or **Command+Shift+L** on Mac. You can also use **Captions → In-app live captions**.

Under **Captions → Caption engine**, choose **Built-in captions (Whisper)** to turn captions on, or **None** to turn them off. None clears the text and stops audio capture and recognition. The shortcut toggles your last-used engine, and the menu selection follows it. Captions start off when you open the app.

Turning captions on rewinds the video **15 seconds** so you get the lead-in. It happens once when going from off to on; changing speed or channels while captions are running doesn't rewind again. The compact guide player rewinds within the available video when the full player's rewind control isn't present.

The default engine is Whisper. It recognizes English speech on your computer, using models included in the installer. It doesn't need a speech account or send audio to a speech service. Watching channels still needs an internet connection.

## Appearance

Use **Captions → Text color** for white or yellow text. **Text size** has five choices: 80%, 100%, 125%, 150%, and 200%. The app remembers these settings.

Captions have a transparent background and a dark text shadow for readability. They fill up to two lines and then start a new block. In fullscreen, text can use more of the picture's width. Changing size or resizing the window adjusts how many words fit.

Speech detection keeps captions visible between recognition results. After a pause and a short reading hold, the screen clears, including any older blocks still waiting to appear. Music or noise can't keep a stale subtitle alive indefinitely: without new recognized words, it clears within 4.5 seconds. New dialogue starts a fresh block. Changing channels clears the old captions and restarts Whisper for the new audio.

## Subtitle timing

Use **Captions → Subtitle delay** to add time before text appears. Choose a preset or adjust it in **0.1-second** steps, from **0 to 10 seconds**. The setting is saved. You can assign delay adjustments to keys or controller buttons in Settings → Controls.

Text and its pause clearing shift together. Turning captions off, pausing playback, seeking, or changing channels clears the current text and any pending captions immediately. Resuming starts fresh without another automatic rewind.

This adds display delay to captions that arrive early. It can't make Whisper recognize words before it has heard them. Leave it at zero if captions are already late.

## Recognition speed

**Captions → Recognition speed** has two options:

| Setting | Model | When to use it |
| --- | --- | --- |
| Faster, the default | Whisper tiny English | Start here for shorter delays, especially on older computers. |
| Balanced | Whisper base English | Try the larger model if you want to compare recognition and your computer can keep up. |

Speech arrives in short batches, so captions lag behind the audio. Faster mode checks a growing phrase and confirms words as results agree, keeping enough context to avoid cutting words into separate fragments. The larger Balanced model takes more processing time; it isn't a guarantee of better results for every recording. If captions fall behind in Balanced mode, switch back to Faster.

The app remembers your choice. Recognition speed and text size are separate settings.

## What audio is used

Whisper listens to the default speaker or headphone output. Speech from another app can appear in the captions too. It doesn't select a microphone or save audio or transcripts.

After changing speakers, headphones, or another output device, turn captions off and on to reconnect. Turning captions off or closing the app window stops its capture and recognition processes.

## Windows Live Captions

On **Windows 11 22H2 or newer**, you can choose **Captions → Caption engine → Windows Live Captions (Windows 11)**. This is an alternative to Whisper, and uses Windows' speech settings. Windows may ask you to download speech files the first time.

The app reads text from the Windows caption window and minimizes that window while displaying the text over the video. When stopped, it restores a window that was already open, or closes one it started. Use **Captions → Open Windows caption window** for setup or troubleshooting. Windows' own shortcut is **Windows+Ctrl+L**; the app's shortcut is **Ctrl+Shift+L**.

To return to Whisper, choose **Caption engine → Built-in captions (Whisper)**. Windows Live Captions isn't available on Windows 10; use Whisper there.

A channel's own CC or subtitle tracks, when available, are separate from these generated captions.

## Troubleshooting

- **The shortcut does nothing:** click the app first, or use the Captions menu. Shortcuts aren't global.
- **There is no text:** check that captions are enabled and speech is playing. Recognition needs a moment to produce the first block. The Captions menu shows the connection status or an error.
- **Text is delayed:** use Faster mode. Recognition speed depends on the computer and the audio.
- **Captions stopped after switching an output device:** toggle them off and on.
- **Speech from another program appears:** pause that program or mute its audio.
- **Mac captions won't start:** check the [system-audio permission steps](MAC.md#allow-captions-to-use-system-audio).
- **Linux captions won't start:** check the [sound-server requirements](LINUX.md#sound-setup).
- **The Windows caption window isn't connecting:** finish Windows' first-use setup, then toggle captions again. You can use Whisper while troubleshooting the Windows engine.

See [what's been tested](TESTING.md) for platform limits. If you report an issue, include your operating system, app version, caption engine, and recognition speed.

[Back to the app guide](../README.md)
