# Audio (0.8 beta)

Open **Audio → Audio settings**. Changes take effect as you adjust them and are saved in your app profile. **Audio effects** bypasses the listening effects without erasing their settings. The original channel volume and mute controls still work.

## Listening controls

- **Denoiser:** 0 is Off; 1–100 increases adaptive spectral noise reduction. Start around 15–30 for steady VHS hiss. Strong settings can soften speech, music, and ambience. This is not a repair tool for dropouts, clipping, or tape-speed problems. Noise estimates reset when the channel file changes. It runs locally and adds about 21–23 milliseconds of processing delay at common sample rates when enabled.
- **Normalization:** continuously smooths level differences between channels, programs, and commercials. Loud changes turn down quickly; quieter material lifts gradually. Near-silence freezes the gain so pauses do not keep boosting tape hiss. The leveler uses a −20 dBFS RMS target with bounded gain, not a certified LUFS/broadcast measurement. It respects your volume knob. Short peaks and heavily distorted sources can still sound different.
- **Compression:** the amount slider makes the dynamic range narrower. **Pre EQ** places compression before the equalizer; **Post EQ** puts it after the equalizer. Pairing adjusts makeup gain as you move compression. Unpair to set makeup independently, from −12 to +18 dB. Turning compression off bypasses its makeup gain too.
- **Graphic EQ:** ten bands from 31 Hz to 16 kHz, each ±12 dB. **Flat EQ** resets the bands without changing the other effects. Positive EQ gets automatic headroom; an output limiter helps contain peaks while effects are active.

The signal order is **Denoiser → Normalization → Compression/EQ (your chosen order) → Output limiter**. Turning all effects off restores the direct listening path. Switching a previously unprocessed channel into the audio path may briefly reconnect playback; the app restores its position.

## Memory bank

Choose a preset and press **Load**. The standard presets are starting points, not universal corrections:

| Preset | Starting point |
| --- | --- |
| Straight from the VCR | Original sound; all effects off |
| Channel Surfer | Level matching only |
| Living Room ’89 | Mild denoising and compression; warm middle and softer treble |
| Rabbit Ears | Dialogue presence, less low rumble, gentle hiss reduction |
| The Late Late Show | Stronger compression for quiet evening listening; Post EQ |
| Hi-Fi Stereo | Small bass/presence adjustments and light compression for cleaner tapes |

Give your sound a name and press **Save new**. Up to 32 personal presets are kept. **Update** replaces the selected personal preset with your current listening settings; **Delete** removes that personal preset. Built-in presets cannot be overwritten. The currently active sound, effect bypasses, pairing, placement, and personal presets all survive quitting and reopening the app.

These curves are original app presets, informed by [Shure's EQ guidance](https://www.shure.com/en-US/docs/guide/P300) on rumble and speech presence and [iZotope's restoration guide](https://downloads.izotope.com/guides/iZotope-AudioRepairAndEnhancement.pdf) on steady hiss/hum and conservative restoration. Neither source prescribes these exact curves. VHS linear audio and Hi-Fi recordings can need quite different treatment; compare gently by ear.

## A separate feed for subtitles

**Subtitle audio cleanup** affects only built-in Whisper captions. It is independent of Audio effects, your volume, and listening presets. The recognizer already reads the channel file in a separate process, so listening denoising, EQ, and compression never color its input.

When enabled, the recognition feed uses an 85 Hz high-pass, gentle adaptive FFT noise reduction (6 dB), and a 7.6 kHz low-pass before 16 kHz mono recognition. Cleanup preserves the sample duration and subtitle media clock. Changing it rebuilds the current caption buffer without an extra rewind. The setting is remembered independently of listening presets.

Cleanup is **off by default**. A clean/noisy speech fixture retained its wording and timing but showed no accuracy improvement from cleanup; different tapes may improve or worsen. The listening denoiser and this recognition filter are separate implementations. This option does not alter Windows Live Captions, which uses its own input path.

## Implementation and checks

The sandboxed player uses Web Audio, a stereo-linked spectral AudioWorklet, and native compressor/EQ nodes. Settings are validated and written atomically by a local settings window. Public Archive media responses receive anonymous CORS access only for media-file requests belonging to this player; web security remains enabled and account/API endpoints are excluded.

`npm test` covers level changes, silence, bounds, preset persistence, IPC access, CORS scope, and denoiser reconstruction/noise reduction. Run `electron scripts/check-audio-app.cjs` for real Chromium graph ordering, media-volume behavior, settings/preset UI, and close/reopen checks. `node scripts/check-subtitle-cleanup.cjs FFMPEG HELPER JFK_WAV OUTPUT_DIRECTORY` compares clean/noisy/cleaned recognition fixtures and checks unchanged sample length. These checks do not replace listening tests across many tapes, speakers, and headphones.
