"""Local Linux speech recognition. Only speaker-monitor audio is captured, never a mic."""
import argparse
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import threading
import wave


def emit(kind, text):
    print(json.dumps({"type": kind, "text": text}), flush=True)


def model_path():
    # The model lives beside the frozen helper, outside PyInstaller's runtime files.
    base = Path(sys.executable).parent if getattr(sys, "frozen", False) else Path(__file__).parent / "bin/linux"
    return base / "model"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--test-wav", type=Path, help="Recognize a local 16 kHz mono PCM test fixture instead of capturing speakers")
    args = parser.parse_args()
    from vosk import Model, KaldiRecognizer, SetLogLevel
    SetLogLevel(-1)
    emit("status", "Loading local speech model…")
    recognizer = KaldiRecognizer(Model(str(model_path())), 16000)
    stopped = threading.Event()
    capture = None
    history = []

    def stop(*_):
        stopped.set()
        if capture is not None and capture.poll() is None:
            capture.terminate()

    def watch_parent():
        # EOF also stops capture when the desktop app exits unexpectedly.
        sys.stdin.buffer.readline()
        stop()

    def recognize(data):
        if recognizer.AcceptWaveform(data):
            words = json.loads(recognizer.Result()).get("text", "")
            history.extend(words.split())
            del history[:-512]
            text = " ".join(history)
        else:
            partial = json.loads(recognizer.PartialResult()).get("partial", "")
            text = " ".join([*history, partial]).strip()
        emit("caption", text)

    if args.test_wav:
        with wave.open(str(args.test_wav), "rb") as audio:
            if (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) != (1, 2, 16000):
                raise ValueError("Test audio must be 16 kHz mono signed 16-bit PCM")
            while data := audio.readframes(2048):
                recognize(data)
        emit("caption", " ".join([*history, json.loads(recognizer.FinalResult()).get("text", "")]).strip())
        return

    if not shutil.which("parec"):
        raise RuntimeError("Speaker capture is unavailable. Install pulseaudio-utils (Debian/Fedora) or libpulse (Arch), then try again.")
    # @DEFAULT_MONITOR@ is PulseAudio's speaker monitor; never fall back to the default microphone.
    capture = subprocess.Popen(["parec", "--device=@DEFAULT_MONITOR@", "--format=s16le", "--rate=16000",
                                "--channels=1", "--latency-msec=100", "--client-name=Spelunkr captions"],
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    threading.Thread(target=watch_parent, daemon=True).start()
    emit("caption", "")
    emit("status", "Listening to speakers · local English captions")
    try:
        while not stopped.is_set():
            data = capture.stdout.read(4096)
            if not data:
                break
            recognize(data)
        if not stopped.is_set():
            raise RuntimeError("Could not read speaker audio. Check that PulseAudio or PipeWire's PulseAudio compatibility service is running. After changing the output device, toggle captions off and on.")
    finally:
        stop()
        capture.wait(timeout=3)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit("error", str(error))
        sys.exit(1)
