const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '.levi.json';

// Early configs listed files as an array; hashes are unknown there, so each file reads as null.
function normalize(entry) {
  if (!entry) return { files: {} };
  const files = Array.isArray(entry.files) ? Object.fromEntries(entry.files.map((p) => [p, null])) : entry.files || {};
  return { ...entry, files };
}

function read(projectDir) {
  const file = path.join(projectDir, CONFIG_FILE);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.usecases = Object.fromEntries(Object.entries(data.usecases || {}).map(([id, e]) => [id, normalize(e)]));
  data.router = normalize(data.router);
  data.team = normalize(data.team);
  return data;
}

function write(projectDir, config) {
  fs.writeFileSync(path.join(projectDir, CONFIG_FILE), JSON.stringify(config, null, 2) + '\n');
}

module.exports = { CONFIG_FILE, read, write };
