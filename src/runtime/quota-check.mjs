#!/usr/bin/env node
// Quota guard helper installed with every levi skill. It reads how much of the 5-hour usage
// window is used, and (on Codex) arms a crontab job that resumes an interrupted run once the
// quota is back. It never runs a levi workflow itself.
//
//   check --tool claude|codex [--threshold 95]    print the 5-hour usage as JSON
//   record [--passthrough]                        statusline hook: save Claude Code's usage (JSON on stdin)
//   cron-arm --session <id> --project <dir> [--every 2] [--threshold 95] [-- <codex exec resume flags>]
//   cron-disarm --session <id>
//   cron-fire --session <id> --project <dir> [--threshold 95] [-- <flags>]    called by the crontab line

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const THRESHOLD = 95;
const EVERY_HOURS = 2;
const FIVE_HOURS = 300;
const STALE_MS = 30 * 60 * 1000;
const TAIL_BYTES = 512 * 1024;
const RESUME_PROMPT = 'I ran out of quota a moment ago and the run was interrupted. Please continue the process or workflow you were running.';

const claudeFile = () => path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'levi-quota.json');
const codexSessions = () => path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions');

function result(tool, fields) {
  const threshold = fields.threshold;
  const used = fields.usedPercent;
  const known = typeof used === 'number';
  return { tool, status: known ? 'ok' : 'unknown', ...fields, atThreshold: known && used >= threshold };
}

// A window whose reset time has passed holds no usage any more.
function window(used, resetsAtSeconds, now = Date.now()) {
  if (typeof used !== 'number') return {};
  const passed = typeof resetsAtSeconds === 'number' && resetsAtSeconds * 1000 <= now;
  return { usedPercent: passed ? 0 : used, resetsAt: resetsAtSeconds ? new Date(resetsAtSeconds * 1000).toISOString() : null };
}

function checkClaude(threshold) {
  const file = claudeFile();
  if (!fs.existsSync(file)) return result('claude', { threshold, source: file, reason: 'the statusline bridge is not set up (no usage file)' });
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Date.now() - saved.recordedAt > STALE_MS) return result('claude', { threshold, source: file, reason: 'the usage file is stale' });
  return result('claude', { threshold, source: file, ...window(saved.usedPercent, saved.resetsAt) });
}

function newestRollout(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir, { recursive: true }).filter((f) => /rollout-.*\.jsonl$/.test(f)).sort();
  return files.length ? path.join(dir, files[files.length - 1]) : null;
}

function lastRateLimits(file) {
  const size = fs.statSync(file).size;
  const fd = fs.openSync(file, 'r');
  const buffer = Buffer.alloc(Math.min(size, TAIL_BYTES));
  fs.readSync(fd, buffer, 0, buffer.length, size - buffer.length);
  fs.closeSync(fd);
  const lines = buffer.toString('utf8').split('\n').reverse();
  for (const line of lines) {
    if (!line.includes('"rate_limits"')) continue;
    try {
      const event = JSON.parse(line);
      const limits = (event.payload && event.payload.rate_limits) || event.rate_limits;
      if (limits && typeof limits === 'object') return limits;
    } catch {
      // The first line of the tail may be cut in half; skip it.
    }
  }
  return null;
}

function checkCodex(threshold) {
  const file = newestRollout(codexSessions());
  if (!file) return result('codex', { threshold, source: codexSessions(), reason: 'no Codex session file found' });
  const sessionId = process.env.CODEX_THREAD_ID || (file.match(/([0-9a-f-]{36})\.jsonl$/) || [])[1] || null;
  const limits = lastRateLimits(file);
  const fiveHour = limits && [limits.primary, limits.secondary].find((w) => w && w.window_minutes === FIVE_HOURS);
  if (!fiveHour) return result('codex', { threshold, source: file, sessionId, reason: 'no 5-hour rate limit recorded yet' });
  return result('codex', { threshold, source: file, sessionId, ...window(fiveHour.used_percent, fiveHour.resets_at) });
}

function check(tool, threshold) {
  if (tool === 'claude') return checkClaude(threshold);
  if (tool === 'codex') return checkCodex(threshold);
  return result(tool, { threshold, reason: `no way to read the quota of "${tool}"` });
}

// Statusline hook for Claude Code: the only place it shows the usage is the JSON it pipes in.
function record(passthrough) {
  const input = fs.readFileSync(0, 'utf8');
  try {
    const five = JSON.parse(input).rate_limits.five_hour;
    fs.writeFileSync(claudeFile(), JSON.stringify({ recordedAt: Date.now(), usedPercent: five.used_percentage, resetsAt: five.resets_at }) + '\n');
    if (!passthrough) process.stdout.write(`5h ${Math.round(five.used_percentage)}%`);
  } catch {
    if (!passthrough) process.stdout.write('5h ?');
  }
  if (passthrough) process.stdout.write(input);
}

// ---- crontab job (Codex) ----

const crontab = () => process.env.LEVI_CRONTAB || 'crontab';
const marker = (session) => `# levi-quota-resume ${session}`;
const quote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

function readCrontab() {
  const out = spawnSync(crontab(), ['-l'], { encoding: 'utf8' });
  return out.status === 0 ? out.stdout.split('\n').filter((l) => l.trim()) : [];
}

function writeCrontab(lines) {
  const out = spawnSync(crontab(), ['-'], { input: lines.join('\n') + (lines.length ? '\n' : ''), encoding: 'utf8' });
  if (out.status !== 0) throw new Error(`crontab failed: ${out.stderr || out.stdout}`);
}

const withoutJob = (lines, session) => lines.filter((l) => !l.endsWith(marker(session)));

function which(name) {
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function arm({ session, project, every, threshold, flags }) {
  const codex = which('codex');
  if (!codex) throw new Error('codex is not on PATH, so the resume job cannot call it');
  const self = fileURLToPath(import.meta.url);
  const log = path.join(os.tmpdir(), `levi-quota-resume-${session}.log`);
  const command = [process.execPath, self, 'cron-fire', '--session', session, '--project', project, '--threshold', threshold, '--codex', codex, '--', ...flags]
    .map(quote)
    .join(' ');
  // 7 minutes past, so that jobs do not all start on the hour. "%" is special inside a crontab line.
  const line = `7 */${every} * * * ${command} >> ${quote(log)} 2>&1 ${marker(session)}`.replace(/%/g, '\\%');
  writeCrontab([...withoutJob(readCrontab(), session), line]);
  const daemon = spawnSync('pgrep', ['-x', 'cron']).status === 0 || spawnSync('pgrep', ['-x', 'crond']).status === 0;
  return { armed: true, session, every, log, cronRunning: daemon, warning: daemon ? null : 'no cron daemon is running; start it (on WSL: enable systemd or run `sudo service cron start`) or the job will never fire' };
}

function disarm(session) {
  writeCrontab(withoutJob(readCrontab(), session));
  return { armed: false, session };
}

// Called by cron. While the quota is still used up it does nothing; otherwise it removes its
// own job first (the resumed run re-arms one if it runs low again), then resumes the session.
function fire({ session, project, threshold, flags, codex }) {
  const state = check('codex', threshold);
  if (state.atThreshold) return { fired: false, reason: 'quota still used up', state };
  disarm(session);
  const run = spawnSync(codex || 'codex', ['exec', 'resume', ...flags, session, RESUME_PROMPT], { cwd: project, stdio: 'inherit' });
  if (run.status !== 0) arm({ session, project, every: EVERY_HOURS, threshold, flags });
  return { fired: true, exitCode: run.status };
}

// ---- command line ----

function parseArgs(argv) {
  const split = argv.indexOf('--');
  const flags = split === -1 ? [] : argv.slice(split + 1);
  const options = {};
  const own = split === -1 ? argv : argv.slice(0, split);
  for (let i = 0; i < own.length; i++) {
    if (!own[i].startsWith('--')) continue;
    const next = own[i + 1];
    options[own[i].slice(2)] = next === undefined || next.startsWith('--') ? true : (i++, next);
  }
  return { options, flags };
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { options, flags } = parseArgs(rest);
  const threshold = Number(options.threshold || THRESHOLD);
  const job = { session: options.session, project: path.resolve(options.project || '.'), every: Number(options.every || EVERY_HOURS), threshold, flags, codex: options.codex };
  if (command === 'record') return record(Boolean(options.passthrough));
  if (command === 'check') return console.log(JSON.stringify(check(options.tool, threshold), null, 2));
  if (!['cron-arm', 'cron-disarm', 'cron-fire'].includes(command)) throw new Error('usage: quota-check.mjs check|record|cron-arm|cron-disarm|cron-fire ...');
  if (!job.session) throw new Error('--session is required');
  const actions = { 'cron-arm': () => arm(job), 'cron-disarm': () => disarm(job.session), 'cron-fire': () => fire(job) };
  console.log(JSON.stringify(actions[command](), null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
