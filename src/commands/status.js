const config = require('../lib/config');
const { sync } = require('../lib/sync');
const { printReport } = require('../lib/report');

// Shows what `update` would do, without writing anything.
function status(projectDir) {
  const existing = config.read(projectDir);
  if (!existing) {
    console.error(`No ${config.CONFIG_FILE} found. Run "levi init" first.`);
    process.exitCode = 1;
    return;
  }
  const { actions } = sync(projectDir, Object.keys(existing.usecases), existing.tools, existing, { dryRun: true });
  printReport(actions, { dryRun: true });
}

module.exports = { status };
