"""Build a self-contained helper and bundle the versioned English model."""
import hashlib
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request
import zipfile

root = Path(__file__).resolve().parent.parent
output = root / "native/bin/linux"
if (output / ".complete").is_file() and (root / "native/bin/test.wav").is_file():
    print("Linux captions already built; using native/bin/linux")
    sys.exit(0)

subprocess.run([sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean", "--onedir",
                "--name", "caption-reader", "--collect-all", "vosk", "--hidden-import", "_cffi_backend",
                "--collect-all", "backports.tarfile", "--recursive-copy-metadata", "vosk",
                "--distpath", str(root / "native/bin/frozen"),
                "--workpath", str(root / "native/bin/build"), "--specpath", str(root / "native/bin"),
                str(root / "native/linux_caption_reader.py")], check=True)
shutil.copytree(root / "native/bin/frozen/caption-reader", output, dirs_exist_ok=True)
archive = root / "native/bin/vosk-model-small-en-us-0.15.zip"
urllib.request.urlretrieve("https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip", archive)
if hashlib.sha256(archive.read_bytes()).hexdigest() != "30f26242c4eb449f948e42cb302dd7a686cb29a3423a8367f99ff41780942498":
    raise ValueError("Speech model download failed its SHA-256 verification")
with zipfile.ZipFile(archive) as bundle:
    for item in bundle.infolist():
        parts = Path(item.filename).parts
        if not parts or parts[0] != "vosk-model-small-en-us-0.15" or ".." in parts or Path(item.filename).is_absolute():
            raise ValueError("Unexpected path in speech model archive")
    bundle.extractall(root / "native/bin/model-unpacked")
shutil.copytree(root / "native/bin/model-unpacked/vosk-model-small-en-us-0.15", output / "model", dirs_exist_ok=True)
shutil.copyfile(root / "native/LINUX-NOTICES.md", output / "LINUX-NOTICES.md")
for filename, url in {
    "LICENSE-APACHE-2.0.txt": "https://www.apache.org/licenses/LICENSE-2.0.txt",
    "LICENSE-PYTHON.txt": "https://raw.githubusercontent.com/python/cpython/3.10/LICENSE",
}.items():
    urllib.request.urlretrieve(url, output / filename)
(output / ".complete").write_text("vosk 0.3.45 / model-small-en-us 0.15\n")
urllib.request.urlretrieve("https://raw.githubusercontent.com/alphacep/vosk-api/v0.3.45/python/example/test.wav",
                           root / "native/bin/test.wav")
