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
try:
    for event in events:
        if event['type'] == 'status' and event['text'].startswith('Benchmark:'):
            print(event['text'], flush=True)
    subprocess.run(['node', str(Path(__file__).with_name('smoke-capture.cjs')), str(helper.parent.parent), str(fixture)], check=True, timeout=100)
finally:
    subprocess.run(['pactl', 'unload-module', module], check=True)
