# Speech and audio component credits

Spelunkr Desktop uses the following components for its built-in captions. Their licenses are separate from the wrapper's [MIT license](../LICENSE).

| Component | Used for | License |
| --- | --- | --- |
| [Whisper.cpp 1.9.5](https://github.com/ggml-org/whisper.cpp/tree/v1.9.5) and its GGML code | Local speech recognition | MIT |
| [Whisper English tiny/base models, Q5_1](https://huggingface.co/ggerganov/whisper.cpp) | Included speech models | [MIT, OpenAI](https://github.com/openai/whisper/blob/main/LICENSE) |
| [Silero VAD 6.2.0](https://github.com/snakers4/silero-vad) | Speech detection | MIT |
| [AudioTee](https://github.com/makeusabrew/audiotee/tree/56ac954369a09318e46b88a6eec33c2d2b0d32a3) | Mac speaker-output capture | MIT; copyright 2025 Nick Payne |

The build pins Whisper.cpp to `d1be6fde11ac6e0407606b4e42fe72d34add8037` and AudioTee to `56ac954369a09318e46b88a6eec33c2d2b0d32a3`. Downloaded speech and VAD models are checked against pinned SHA-256 hashes in [the build script](../scripts/build-whisper.cjs).

Copies of the component licenses ship beside the installed caption helper: `resources/native/whisper/` under the Windows/Linux install folder, or `Spelunkr Desktop.app/Contents/Resources/native/whisper/` on Mac. The files include `LICENSE-WHISPER.txt`, `LICENSE-GGML.txt`, `LICENSE-WHISPER-MODELS.txt`, `LICENSE-SILERO.txt`, and, on Mac, `LICENSE-AUDIOTEE.txt`.

Recognition runs locally. The app selects output audio, which may include other applications, and doesn't select a microphone or save audio or transcripts. Mac capture uses Apple's Core Audio taps API and requires macOS 14.2 or newer and system-audio recording permission. See the [caption guide](../docs/CAPTIONS.md) and [Mac setup](../docs/MAC.md) for user instructions.
