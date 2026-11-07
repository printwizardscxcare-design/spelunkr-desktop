# Local caption components

Whisper.cpp v1.9.5 (MIT): https://github.com/ggml-org/whisper.cpp
Whisper English base/tiny models, quantized Q5_1 (MIT):
https://huggingface.co/ggerganov/whisper.cpp
https://github.com/openai/whisper/blob/main/LICENSE
Silero VAD v6.2.0 speech detection (MIT): https://github.com/snakers4/silero-vad

Mac system-output capture uses AudioTee (MIT, Copyright 2025 Nick Payne),
revision 56ac954369a09318e46b88a6eec33c2d2b0d32a3:
https://github.com/makeusabrew/audiotee
Copies of the component licenses accompany these files.

Recognition and speech detection run locally. No audio or transcript is saved.
Only output audio is selected; no microphone input is selected. Output capture
may include sound from other applications. Mac capture requires macOS 14.2+ and
the user's System Audio Recording permission.
