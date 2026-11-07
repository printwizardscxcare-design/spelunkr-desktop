"""Exercise the packaged recognizer through an actual PulseAudio speaker monitor."""
import json
from pathlib import Path
import queue
import subprocess
import sys
import threading
import time

helper, fixture = map(Path, sys.argv[1:])
# Recognition of recorded speech checks the bundled library, model, and PCM format.
result = subprocess.run([str(helper), "--test-wav", str(fixture)], capture_output=True, text=True, timeout=180)
assert result.returncode == 0, result.stdout + result.stderr
events = [json.loads(line) for line in result.stdout.splitlines()]
assert not any(event["type"] == "error" for event in events), result.stdout
assert any(event["type"] == "caption" and ("one" in event["text"].lower() or "1" in event["text"]) for event in events), result.stdout

subprocess.run(["pulseaudio", "--start", "--exit-idle-time=-1"], check=True)
module = subprocess.check_output(["pactl", "load-module", "module-null-sink", "sink_name=spelunkr_test"], text=True).strip()
subprocess.run(["pactl", "set-default-sink", "spelunkr_test"], check=True)
capture = subprocess.Popen(['parec', '--device=@DEFAULT_MONITOR@', '--format=s16le', '--rate=16000', '--channels=1'], stdout=subprocess.PIPE)
child = subprocess.Popen([str(helper), '--pcm', '--model', 'tiny.en'], stdin=capture.stdout, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
capture.stdout.close()
lines = queue.Queue()
def read_output():
    for line in child.stdout:
        lines.put(json.loads(line))
threading.Thread(target=read_output, daemon=True).start()
try:
    deadline = time.monotonic() + 45
    while True:
        event = lines.get(timeout=max(.1, deadline - time.monotonic()))
        assert event["type"] != "error", event
        if event["type"] == "status" and "Listening" in event["text"]:
            break
    time.sleep(.5)
    subprocess.run(["paplay", "--device=spelunkr_test", str(fixture)], check=True, timeout=30)
    spoken = False
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        event = lines.get(timeout=max(.1, deadline - time.monotonic()))
        assert event["type"] != "error", event
        if event["type"] == "caption" and "one" in event["text"]:
            spoken = True
            break
    assert spoken, "No recognized speaker audio"
    capture.terminate()
    capture.wait(timeout=5)  # Capture EOF must stop recognition cleanly.
    assert child.wait(timeout=5) == 0, child.stderr.read()
    assert subprocess.run(["pgrep", "-x", "parec"], stdout=subprocess.DEVNULL).returncode != 0
    print("PASS: bundled recognition, speaker monitor, parent-exit cleanup")
finally:
    if capture.poll() is None:
        capture.terminate()
        capture.wait(timeout=5)
    if child.poll() is None:
        child.terminate()
        child.wait(timeout=5)
    subprocess.run(["pactl", "unload-module", module], check=True)
