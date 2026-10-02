const config = require('../lib/config');
const { sync } = require('../lib/sync');
const { printReport } = require('../lib/report');
const { kitVersion } = require('../lib/usecases');
const { invocationHelp } = require('../lib/tools');

// `--force` alone overwrites every file the user changed; with paths it only overwrites those.
function parseForce(argv) {
  const paths = argv.filter((a) => a !== '--force');
  if (!argv.includes('--force')) return false;
  return paths.length ? new Set(paths) : true;
}

function update(projectDir, argv = []) {
  const existing = config.read(projectDir);
  if (!existing) {
    console.error(`No ${config.CONFIG_FILE} found. Run "levi init" first.`);
    process.exitCode = 1;
    return;
  }
  const result = sync(projectDir, Object.keys(existing.usecases), existing.tools, existing, { force: parseForce(argv) });
  config.write(projectDir, { version: kitVersion(), tools: existing.tools, usecases: result.usecases, router: result.router, team: result.team });
  console.log(`Updated ${existing.version} -> ${kitVersion()} (${Object.keys(result.usecases).length} usecase(s))`);
  printReport(result.actions);
  for (const id of result.missing) console.log(`\n${id} is no longer in the kit; its unchanged files were removed.`);
  if (Object.keys(result.usecases).length) console.log(`\nInvoke with:\n${invocationHelp(existing.tools)}`);
}

module.exports = { update };
