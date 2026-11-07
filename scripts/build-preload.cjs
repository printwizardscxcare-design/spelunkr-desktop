'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const pages = fs.readFileSync(path.join(root, 'src/caption-pages.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'src/preload.cjs'), 'utf8');
// A self-contained preload is required by Electron's renderer sandbox. This embeds
// our local pure layout module; it never bundles or evaluates code from the site.
const bundle = `const { CaptionPages } = (() => {\nconst module = { exports: {} };\n${pages}\nreturn module.exports;\n})();\n${preload}`;
fs.writeFileSync(path.join(root, 'src/preload.generated.cjs'), bundle);
