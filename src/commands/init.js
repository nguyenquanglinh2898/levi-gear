const config = require('../lib/config');
const { sync } = require('../lib/sync');
const { printReport } = require('../lib/report');
const { listUsecases, kitVersion } = require('../lib/usecases');
const { TOOLS, invocationHelp } = require('../lib/tools');

function parseArgs(argv) {
  const names = [];
  let tools = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--tools') tools = argv[++i];
    else if (arg.startsWith('--tools=')) tools = arg.slice('--tools='.length);
    else names.push(arg);
  }
  return { names, tools: tools ? tools.split(',').filter(Boolean) : null };
}

function init(projectDir, argv) {
  const { names, tools: requested } = parseArgs(argv);
  const existing = config.read(projectDir) || { tools: null, usecases: {}, router: { files: {} }, team: { files: {} } };
  const tools = requested || existing.tools || TOOLS;
  const unknown = tools.filter((t) => !TOOLS.includes(t));
  if (unknown.length) {
    console.error(`Unknown tool(s): ${unknown.join(', ')}. Choose from: ${TOOLS.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const wanted = names.length ? names : listUsecases().map((u) => u.id);
  const ids = [...new Set([...Object.keys(existing.usecases), ...wanted])];
  const result = sync(projectDir, ids, tools, existing);
  config.write(projectDir, { version: kitVersion(), tools, usecases: result.usecases, router: result.router, team: result.team });
  console.log(`Installed ${Object.keys(result.usecases).length} usecase(s) for: ${tools.join(', ')}`);
  for (const id of Object.keys(result.usecases)) console.log(`  - ${id}`);
  printReport(result.actions);
  if (Object.keys(result.usecases).length) console.log(`\nInvoke with:\n${invocationHelp(tools)}`);
  if (result.missing.length) {
    console.error(`Not found in kit: ${result.missing.join(', ')}`);
    process.exitCode = 1;
  }
}

module.exports = { init };
