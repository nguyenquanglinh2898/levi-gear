const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '.davinci.json';

function read(projectDir) {
  const file = path.join(projectDir, CONFIG_FILE);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function write(projectDir, config) {
  fs.writeFileSync(path.join(projectDir, CONFIG_FILE), JSON.stringify(config, null, 2) + '\n');
}

module.exports = { CONFIG_FILE, read, write };
