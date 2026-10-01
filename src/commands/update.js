const config = require('../lib/config');
const { sync } = require('../lib/install');
const { kitVersion } = require('../lib/usecases');
const { invocationHelp } = require('../lib/tools');

function update(projectDir) {
  const existing = config.read(projectDir);
  if (!existing) {
    console.error(`No ${config.CONFIG_FILE} found. Run "davinci init" first.`);
    process.exitCode = 1;
    return;
  }
  const { installed, router, missing } = sync(projectDir, Object.keys(existing.usecases), existing.tools, existing);
  config.write(projectDir, { version: kitVersion(), tools: existing.tools, usecases: installed, router });
  console.log(`Updated ${existing.version} -> ${kitVersion()} (${Object.keys(installed).length} usecase(s))`);
  if (Object.keys(installed).length) console.log(`\nInvoke with:\n${invocationHelp(existing.tools)}`);
  for (const id of missing) console.log(`Removed ${id} (no longer in the kit)`);
}

module.exports = { update };
