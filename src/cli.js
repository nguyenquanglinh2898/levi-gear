const { init } = require('./commands/init');
const { update } = require('./commands/update');
const { list } = require('./commands/list');
const { kitVersion } = require('./lib/usecases');

const HELP = `davinci ${kitVersion()}

Usage: davinci <command>

Commands:
  init [usecase...] [--tools claude,codex,copilot]
           Install usecases (all by default) for the chosen tools
  update   Refresh installed usecases to this package version
  list     List usecases available in the kit
`;

function main(argv) {
  const [command, ...rest] = argv;
  const projectDir = process.cwd();
  try {
    switch (command) {
      case 'init':
        return init(projectDir, rest);
      case 'update':
        return update(projectDir);
      case 'list':
        return list(projectDir);
      case undefined:
      case '-h':
      case '--help':
        return console.log(HELP);
      case '-v':
      case '--version':
        return console.log(kitVersion());
      default:
        console.error(`Unknown command: ${command}\n\n${HELP}`);
        process.exitCode = 1;
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

module.exports = { main };
