const paths = (actions, op) => actions.filter((a) => a.op === op).map((a) => a.path);

function section(title, list) {
  if (list.length) console.log(`\n${title}\n${list.map((p) => `  ${p}`).join('\n')}`);
}

// Summarizes what a sync did (or, for dryRun, would do) to the user's files.
function printReport(actions, { dryRun = false } = {}) {
  const verb = dryRun ? ['Would add', 'update', 'remove'] : ['Added', 'updated', 'removed'];
  const count = (op) => actions.filter((a) => a.op === op).length;
  console.log(`${verb[0]} ${count('add')}, ${verb[1]} ${count('update')}, ${verb[2]} ${count('remove')} file(s).`);
  section('Changed by you (kept as is):', paths(actions, 'customized'));
  section('Already exist and are not managed by levi (kept as is):', paths(actions, 'conflict'));
  section('Deleted by you (not recreated):', paths(actions, 'keep-deleted'));
  section('No longer in the kit, kept because you changed them:', paths(actions, 'orphan'));
  if (actions.some((a) => ['customized', 'conflict', 'keep-deleted'].includes(a.op))) {
    console.log('\nTo take the kit version of a file instead: levi update --force [path...]');
  }
}

module.exports = { printReport };
