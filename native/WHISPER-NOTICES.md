# Speech and audio component credits

Spelunkr Desktop uses the following components for its built-in captions. Their licenses are separate from the wrapper's [MIT license](../LICENSE).

| Component | Used for | License |
| --- | --- | --- |
| [Whisper.cpp 1.9.5](https://github.com/ggml-org/whisper.cpp/tree/v1.9.5) and its GGML code | Local speech recognition | MIT |
| [Whisper English tiny/base models, Q5_1](https://huggingface.co/ggerganov/whisper.cpp) | Included speech models | [MIT, OpenAI](https://github.com/openai/whisper/blob/main/LICENSE) |
| [Silero VAD 6.2.0](https://github.com/snakers4/silero-vad) | Speech detection | MIT |
| [FFmpeg 6.1.1 binaries](https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1), distributed by ffmpeg-static 5.3.0 | Decode channel audio ahead of video playback | GPL-3.0-or-later; see the binary's bundled license and source/build notes |
| [AudioTee](https://github.com/makeusabrew/audiotee/tree/56ac954369a09318e46b88a6eec33c2d2b0d32a3) | Mac speaker-output capture | MIT; copyright 2025 Nick Payne |

The build pins Whisper.cpp to `d1be6fde11ac6e0407606b4e42fe72d34add8037` and AudioTee to `56ac954369a09318e46b88a6eec33c2d2b0d32a3`. Downloaded speech and VAD models are checked against pinned SHA-256 hashes in [the build script](../scripts/build-whisper.cjs).

Copies of the component licenses ship beside the installed caption helper: `resources/native/whisper/` under the Windows/Linux install folder, or `Spelunkr Desktop.app/Contents/Resources/native/whisper/` on Mac. The files include `LICENSE-WHISPER.txt`, `LICENSE-GGML.txt`, `LICENSE-WHISPER-MODELS.txt`, `LICENSE-SILERO.txt`, and, on Mac, `LICENSE-AUDIOTEE.txt`.

FFmpeg is a separate executable. Its supplied license is included as `LICENSE-FFMPEG.txt`, and the binary provider's source and build information is included as `SOURCE-FFMPEG.txt`. The pinned binary release and build recipes are available from [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static/tree/b6.1.1); FFmpeg's source is available from [the FFmpeg project](https://ffmpeg.org/download.html#get-sources).

Buffered Whisper captions read the channel's Internet Archive media file directly, decode audio in memory, and recognize it locally. They don't use a microphone or other applications' audio. Audio and transcripts aren't saved. The optional Windows Live Captions engine uses system audio. AudioTee remains bundled as a legacy capture component but isn't used by buffered Whisper captions. See the [caption guide](../docs/CAPTIONS.md) for user instructions.
