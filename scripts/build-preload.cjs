'use strict';
require('./build-usage-config.cjs');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const pages = fs.readFileSync(path.join(root, 'src/caption-pages.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'src/preload.cjs'), 'utf8');
const controls = fs.readFileSync(path.join(root, 'src/controls-model.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'src/controls-runtime.cjs'), 'utf8');
const cache = fs.readFileSync(path.join(root, 'src/caption-cache.cjs'), 'utf8');
const buffered = fs.readFileSync(path.join(root, 'src/caption-buffer-renderer.cjs'), 'utf8');
// A self-contained preload is required by Electron's renderer sandbox. This embeds
// our local pure layout module; it never bundles or evaluates code from the site.
const bundle = `const { CaptionPages } = (() => {\nconst module = { exports: {} };\n${pages}\nreturn module.exports;\n})();\nconst ControlsModel = (() => {\nconst module = { exports: {} };\n${controls}\nreturn module.exports;\n})();\nconst installControls = (() => {\nconst module = { exports: {} };\n${runtime}\nreturn module.exports;\n})();\n${preload}`;
const buffering = `const {CaptionCache} = (() => {const module = {exports:{}};\n${cache}\nreturn module.exports;})();\nconst installCaptionBuffer = (() => {const module = {exports:{}};\n${buffered}\nreturn module.exports;})();\n`;
const audio = [['AudioModel','audio-model.js'],['createAudioGraph','audio-graph.cjs'],['installAudio','audio-runtime.cjs']].map(([name,file]) =>
  `const ${name} = (() => {const module = {exports:{}};\n${fs.readFileSync(path.join(root,'src',file),'utf8')}\nreturn module.exports;})();\n`).join('');
const denoiser = `const DENOISE_WORKLET = ${JSON.stringify(fs.readFileSync(path.join(root,'src/denoise-worklet.js'),'utf8'))};\n`;
fs.writeFileSync(path.join(root, 'src/preload.generated.cjs'), denoiser + audio + buffering + bundle);
