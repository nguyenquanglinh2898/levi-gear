const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const BLOCK_SCALAR = /^([>|])[+-]?$/;

// Flat "key: value" pairs, plus YAML folded (>) and literal (|) multi-line values.
function parse(text) {
  const match = FRONTMATTER.exec(text);
  if (!match) return { data: {}, body: text };
  const data = {};
  const lines = match[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const idx = lines[i].indexOf(':');
    if (idx === -1) continue;
    const key = lines[i].slice(0, idx).trim();
    let value = lines[i].slice(idx + 1).trim();
    const block = BLOCK_SCALAR.exec(value);
    if (block) {
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S|^\s*$/.test(lines[i + 1])) parts.push(lines[++i].trim());
      value = parts.join(block[1] === '>' ? ' ' : '\n').trim();
    } else {
      value = value.replace(/^["']|["']$/g, '');
    }
    if (key) data[key] = value;
  }
  return { data, body: match[2] };
}

// Sets a single-line top-level field, replacing any existing line with the same key.
function setField(text, key, value) {
  const match = FRONTMATTER.exec(text);
  if (!match) return text;
  const lines = match[1].split(/\r?\n/).filter((line) => !line.startsWith(`${key}:`));
  return `---\n${[...lines, `${key}: ${value}`].join('\n')}\n---\n${match[2]}`;
}

module.exports = { parse, setField };
