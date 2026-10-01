const config = require('../lib/config');
const { listUsecases } = require('../lib/usecases');
const { TOOLS, invocationHelp } = require('../lib/tools');

function list(projectDir) {
  const usecases = listUsecases();
  if (!usecases.length) console.log('No usecases in the kit yet.');
  for (const u of usecases) {
    const roles = u.agents.length ? ` [agents: ${u.agents.map((a) => a.name).join(', ')}]` : '';
    console.log(`${u.id}${roles}\n  ${u.description}`);
  }
  if (usecases.length) {
    const installed = config.read(projectDir);
    console.log(`\nInvoke with:\n${invocationHelp(installed ? installed.tools : TOOLS)}`);
  }
}

module.exports = { list };
