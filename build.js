'use strict';
const fs = require('node:fs'),
  path = require('node:path');
const dest = path.join(__dirname, 'dist');
fs.mkdirSync(dest, { recursive: true });
for (const name of ['index.html', 'style.css', 'engine.js', 'app.js'])
  fs.copyFileSync(path.join(__dirname, name), path.join(dest, name));
console.log('Built dependency-free game in dist/. Open dist/index.html or serve the directory.');
