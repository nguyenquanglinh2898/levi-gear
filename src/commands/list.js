const { listUsecases } = require('../lib/usecases');
const { INVOCATION_HELP } = require('../lib/tools');

function list() {
  const usecases = listUsecases();
  if (!usecases.length) console.log('No usecases in the kit yet.');
  for (const u of usecases) {
    const roles = u.agents.length ? ` [agents: ${u.agents.map((a) => a.name).join(', ')}]` : '';
    const requires = u.requires.length ? ` [requires: ${u.requires.join(', ')}]` : '';
    console.log(`${u.id}${roles}${requires}\n  ${u.description}`);
  }
  if (usecases.length) {
    console.log(`\nInvoke with:\n${INVOCATION_HELP}`);
  }
}

module.exports = { list };
