const config = require('../lib/config');
const { sync } = require('../lib/sync');
const { printReport } = require('../lib/report');
const { listUsecases, kitVersion } = require('../lib/usecases');
const { INVOCATION_HELP } = require('../lib/tools');

function init(projectDir, argv) {
  if (argv.some((arg) => arg === '--tools' || arg.startsWith('--tools='))) {
    console.error('levi supports Claude Code only; the --tools option no longer exists.');
    process.exitCode = 1;
    return;
  }
  const existing = config.read(projectDir) || { usecases: {}, router: { files: {} }, team: { files: {} } };
  const wanted = argv.length ? argv : listUsecases().map((u) => u.id);
  const ids = [...new Set([...Object.keys(existing.usecases), ...wanted])];
  const result = sync(projectDir, ids, existing);
  config.write(projectDir, { version: kitVersion(), usecases: result.usecases, router: result.router, team: result.team });
  console.log(`Installed ${Object.keys(result.usecases).length} usecase(s) for Claude Code`);
  for (const id of Object.keys(result.usecases)) console.log(`  - ${id}`);
  printReport(result.actions);
  if (Object.keys(result.usecases).length) console.log(`\nInvoke with:\n${INVOCATION_HELP}`);
  if (result.missing.length) {
    console.error(`Not found in kit: ${result.missing.join(', ')}`);
    process.exitCode = 1;
  }
}

module.exports = { init };
