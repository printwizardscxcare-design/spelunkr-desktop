# Next version — not released

Development builds use version 0.8.0-dev.1. The current public download is still 0.7.0. These changes are being kept on the `next-version` branch until a release is requested.

## Subtitle cooldown

Channel surfing no longer needs to stop for subtitles on every channel. With captions enabled, the app waits for the channel to finish tuning, then shows a small **Subtitles in 5s** countdown near the bottom-right of the video, clear of the site's channel-info card. Changing channels cancels that countdown; the next one gets its full cooldown after tuning finishes. The picture keeps playing while you browse, and old captions disappear.

Once the countdown ends, Whisper prepares the usual 15-second subtitle buffer for the current channel. That buffer is separate from the cooldown. Turning captions on for the first time still prepares them immediately.

Use **Captions → Subtitle cooldown** to choose any whole second up to **30 seconds**, or **Off**. The default is **5 seconds**, and the app remembers your choice. The countdown also works in fullscreen and with the optional Windows caption engine.

Pausing or seeking within the same channel doesn't start a cooldown. Turning captions off cancels a running countdown.
