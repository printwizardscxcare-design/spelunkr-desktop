# Linux caption components

The bundled English speech model is vosk-model-small-en-us-0.15 from
https://alphacephei.com/vosk/models, licensed under Apache License 2.0.
Vosk 0.3.45 is licensed under Apache License 2.0:
https://github.com/alphacep/vosk-api/blob/v0.3.45/COPYING

Python and its standard library are distributed under the Python Software
Foundation License. PyInstaller uses the GPL with its bootloader distribution
exception. The frozen helper also includes Vosk's Python dependencies; their
license metadata is retained in the helper's _internal directory.

Speech recognition runs locally. The model is bundled so enabling captions
does not download a model or send audio to a speech service. No microphone
input is selected. The default speaker monitor can include other apps' audio.
