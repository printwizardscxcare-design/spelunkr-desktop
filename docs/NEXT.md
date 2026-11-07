# 0.8 beta

The beta is being developed on the `next-version` branch. The current beta is **0.8.0-beta.1**. [0.7.0](https://github.com/printwizardscxcare-design/spelunkr-desktop/releases/tag/v0.7.0) remains the current regular download; the beta will stay separate until a regular release is requested.

## Audio

**Audio → Audio settings** adds normalization, a spectral denoiser slider, paired or independent compression/makeup gain, **Pre EQ / Post EQ** placement, and a ten-band EQ. A memory bank includes six classic presets and up to 32 user presets. All current settings and presets persist atomically. A master bypass restores the direct sound.

Optional **Subtitle audio cleanup** is saved independently and processes only Whisper's unheard recognition feed. It preserves the sample clock. It is off by default; the first noisy speech comparison showed retained speech but no wording improvement. See [Audio help](AUDIO.md) for algorithms, reference guidance, and limitations.

## Subtitle cooldown

Channel surfing no longer needs to stop for subtitles on every channel. With captions enabled, the app waits for the channel to finish tuning, then shows a small **Subtitles in 5s** countdown near the bottom-right of the video, clear of the site's channel-info card. Changing channels cancels that countdown; the next one gets its full cooldown after tuning finishes. The picture keeps playing while you browse, and old captions disappear.

Once the countdown ends, Whisper prepares the usual 15-second subtitle buffer for the current channel. That buffer is separate from the cooldown. Turning captions on for the first time still prepares them immediately.

Use **Captions → Subtitle cooldown** to choose any whole second up to **30 seconds**, or **Off**. The default is **5 seconds**, and the app remembers your choice. The countdown also works in fullscreen and with the optional Windows caption engine.

Pausing or seeking within the same channel doesn't start a cooldown. Turning captions off cancels a running countdown.
