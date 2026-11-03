#!/usr/bin/env node
// Quota guard helper installed with every levi skill. It reads how much of the Claude Code
// 5-hour usage window is used. It never runs a levi workflow itself.
//
//   check [--threshold 95]       print the 5-hour usage as JSON
//   record [--passthrough]       statusline hook: save Claude Code's usage (JSON on stdin)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const THRESHOLD = 95;
const STALE_MS = 30 * 60 * 1000;

const usageFile = () => path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'levi-quota.json');

function result(fields) {
  const used = fields.usedPercent;
  const known = typeof used === 'number';
  return { status: known ? 'ok' : 'unknown', ...fields, atThreshold: known && used >= fields.threshold };
}

// A window whose reset time has passed holds no usage any more.
function window(used, resetsAtSeconds, now = Date.now()) {
  if (typeof used !== 'number') return {};
  const passed = typeof resetsAtSeconds === 'number' && resetsAtSeconds * 1000 <= now;
  return { usedPercent: passed ? 0 : used, resetsAt: resetsAtSeconds ? new Date(resetsAtSeconds * 1000).toISOString() : null };
}

function check(threshold) {
  const file = usageFile();
  if (!fs.existsSync(file)) return result({ threshold, source: file, reason: 'the statusline bridge is not set up (no usage file)' });
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Date.now() - saved.recordedAt > STALE_MS) return result({ threshold, source: file, reason: 'the usage file is stale' });
  return result({ threshold, source: file, ...window(saved.usedPercent, saved.resetsAt) });
}

// Statusline hook for Claude Code: the only place it shows the usage is the JSON it pipes in.
function record(passthrough) {
  const input = fs.readFileSync(0, 'utf8');
  try {
    const five = JSON.parse(input).rate_limits.five_hour;
    fs.writeFileSync(usageFile(), JSON.stringify({ recordedAt: Date.now(), usedPercent: five.used_percentage, resetsAt: five.resets_at }) + '\n');
    if (!passthrough) process.stdout.write(`5h ${Math.round(five.used_percentage)}%`);
  } catch {
    if (!passthrough) process.stdout.write('5h ?');
  }
  if (passthrough) process.stdout.write(input);
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const next = argv[i + 1];
    options[argv[i].slice(2)] = next === undefined || next.startsWith('--') ? true : (i++, next);
  }
  return options;
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const options = parseArgs(rest);
  if (command === 'record') return record(Boolean(options.passthrough));
  if (command === 'check') return console.log(JSON.stringify(check(Number(options.threshold || THRESHOLD)), null, 2));
  throw new Error('usage: quota-check.mjs check|record ...');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
