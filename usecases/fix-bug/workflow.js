export const meta = {
  name: 'levi-fix-bug',
  description: 'Fix a bug with TDD: the developer investigates and fixes it while QA writes the scenarios; the teamlead reviews every fix, then QA runs the scenarios end to end until they all pass',
  whenToUse: 'Started by the levi-fix-bug skill once the open points of the bug report are confirmed with the user',
  phases: [
    { title: 'Investigate', detail: 'the developer finds the root cause and makes tests fail on the bug; QA writes the scenarios at the same time' },
    { title: 'Fix', detail: 'fix, unit and feature tests, teamlead review, E2E; repeat until the review approves and every scenario passes' },
  ],
}

// args: { slug, spec?, designs?, base, allMerged?, skillDir, maxRounds? } — see the skill's SKILL.md.
const A = args || {}
const absent = ['slug', 'base', 'skillDir'].filter((k) => !A[k])
if (absent.length) return { status: 'error', message: `missing args: ${absent.join(', ')}` }

const WORK = `docs/levi/${A.slug}`
const REPORT = `${WORK}/report.md`
const CONFIRMED = `${WORK}/confirmed.md`
const INVESTIGATION = `${WORK}/investigation.md`
const REVIEW = `${WORK}/review.md`
const SCENARIOS = `docs/tests/bugs/${A.slug}.md`
const LOCK = `node ${A.skillDir}/../levi-create-feature/scripts/lock-tests.mjs`
const REVIEW_GUIDE = `${A.skillDir}/../levi-code-review/references/review-guide.md`
const LOCK_TESTS = `${WORK}/locked/tests`
const LOCK_SCENARIOS = `${WORK}/locked/scenarios`
const MAX_RED = 3
const MAX_ROUNDS = A.maxRounds || 10

const CONTEXT = [
  `Bug report, as the user gave it: ${REPORT}`,
  `Points confirmed with the user (they override any guess): ${CONFIRMED}`,
  `Spec: ${A.spec || 'none; the expected behavior is what the report and the confirmed points say'}`,
  `Designs: ${A.designs || 'none'}`,
  `Work folder: ${WORK}`,
].join('\n')

// ---- schemas ----

const STATUS = { type: 'string', enum: ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'] }
const QUESTIONS = {
  type: 'array',
  items: { type: 'string' },
  description: 'Points only the user can settle, that the report, the confirmed points and the spec leave open. Empty when none.',
}
const STRINGS = { type: 'array', items: { type: 'string' } }
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties) })

const INVESTIGATE = obj({
  status: STATUS,
  summary: { type: 'string' },
  isBug: { type: 'boolean', description: 'false when the code does what the spec and the confirmed points expect' },
  rootCause: { type: 'string' },
  locations: {
    type: 'array',
    description: 'The lines at the root cause, in the current working tree',
    items: obj({ file: { type: 'string' }, from: { type: 'integer' }, to: { type: 'integer' } }),
  },
  bugTests: { ...STRINGS, description: 'Test files that fail now because of the bug: the ones you wrote, or existing ones that already cover it' },
  wroteTests: { type: 'boolean', description: 'false when existing tests already covered the bug and none were written' },
  testCommand: { type: 'string', description: 'Shell command that runs the unit and feature tests covering the bug' },
  suiteCommand: { type: 'string', description: 'Shell command that runs the whole test suite; empty when the project has none' },
  app: obj({ start: { type: 'string' }, url: { type: 'string' }, notes: { type: 'string' } }),
  hasUi: { type: 'boolean' },
  questions: QUESTIONS,
})
const WRITTEN = obj({ status: STATUS, summary: { type: 'string' }, scenarioCount: { type: 'integer' }, questions: QUESTIONS })
const RUN = obj({ exitCode: { type: 'integer' }, summary: { type: 'string' } })
const GATE = obj({ restored: STRINGS, testsExit: { type: 'integer' }, suiteExit: { type: 'integer' }, failures: { type: 'string' } })
const BASE = obj({ head: { type: 'string' }, dirty: STRINGS })
const MERGED = obj({ unmerged: { ...STRINGS, description: 'Locations with lines not merged into the base branch, with the reason' } })
const FIXED = obj({ status: STATUS, summary: { type: 'string' }, files: STRINGS, blockers: STRINGS })
const CODE_REVIEW = obj({
  approved: { type: 'boolean' },
  summary: { type: 'string' },
  findings: {
    type: 'array',
    items: obj({ severity: { type: 'string', enum: ['critical', 'warning', 'suggestion'] }, file: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } }),
  },
})
const E2E = obj({
  status: STATUS,
  summary: { type: 'string' },
  results: { type: 'array', items: obj({ n: { type: 'integer' }, result: { type: 'string', enum: ['PASS', 'FAIL'] }, evidence: { type: 'string' } }) },
})

// ---- helpers ----

// Mechanical steps (git, the lock script, running tests) go to a plain agent that only runs commands.
const guard = (label, prompt, schema) =>
  agent(`${prompt}\n\nRun the commands from the project root. Do not create, edit or delete any file yourself, and do not try to fix anything. Report only what you observed.`, {
    label,
    schema,
    effort: 'low',
  })

const questionsOf = (r) => (r && r.questions) || []

// ---- QA writes the scenarios, apart from the developer ----

async function qaScenarios() {
  const written = await agent(
    `${CONTEXT}

Write the test scenarios of this bug to ${SCENARIOS}, from the report, the confirmed points, the spec and the designs. Do not read the application code or anything the developer writes.

Format:

# Bug scenarios: <bug in a few words>

- **Report:** <one line: what went wrong>
- **Status:** -

## 1. <short title>
- **Preconditions:** <state, data, user role>
- **Steps:**
  1. <one action>
- **Expected:** <observable result: what the spec or the confirmed points say should happen>
- **Status:** -
- **Evidence:** -

Rules:
- Scenario 1 follows the steps of the report. Then add the nearby cases the same bug could break (other inputs, states, roles). Number them from 1 with no gaps.
- Expected results come from the spec and the confirmed points, never from a guess.
- Each scenario can be run end to end, in a browser for UI and otherwise through the API or the CLI, by someone who has only this file and the running app.
- Leave every Status and Evidence as "-". You fill them in later, when you run the scenarios.
- After this step the file is locked: the fix must pass the scenarios, and nobody may change them. Get them right now.

Return the number of scenarios as scenarioCount.`,
    { label: 'qa:scenarios', phase: 'Investigate', agentType: 'levi-qa', schema: WRITTEN },
  )
  if (!written || written.status === 'BLOCKED') return { stop: 'blocked', detail: written ? written.summary : 'QA did not write the scenarios' }
  if (questionsOf(written).length) return { stop: 'questions', questions: written.questions }
  const locked = await guard('lock-scenarios', `Run \`${LOCK} lock ${LOCK_SCENARIOS} ${SCENARIOS}\` and return its exit code, and its output as summary.`, RUN)
  if (!locked || locked.exitCode !== 0) return { stop: 'blocked', detail: locked ? locked.summary : 'the scenarios could not be locked' }
  return { scenarioCount: written.scenarioCount }
}

// ---- the developer investigates and writes the failing tests (TDD red) ----

async function investigate() {
  let found = await agent(
    `${CONTEXT}

Investigate this bug, test first. Do not fix it yet.

1. Find the root cause in the code: file, function, line range, and why. Look for other places with the same cause. If the code already does what the spec and the confirmed points expect, it is not a bug: say so (isBug=false) and stop.
2. Look at the existing unit and feature tests. If some already cover this bug, they fail now because of it, and they follow the spec and the confirmed points, use them and write nothing (wroteTests=false). Otherwise write the missing unit tests (at the root cause) and feature tests (at the behavior the user saw), with the project's framework and conventions: the reported case and the nearby cases the same cause breaks. Every assertion comes from the spec and the confirmed points.
3. Run them: they must fail now, because of the bug, not because of a typo or a wrong setup.

Write ${INVESTIGATION}: expected against actual, the root cause with its locations, other places with the same cause, the tests that cover the bug, and how you will fix it.
Return also the command that runs the tests covering the bug, the command for the whole suite, and how to start the app for end-to-end tests. After this step the tests that cover the bug are locked: the fix must pass them and nobody may change them.`,
    { label: 'developer:investigate', phase: 'Investigate', agentType: 'levi-developer', schema: INVESTIGATE },
  )
  for (let i = 1; ; i++) {
    if (!found || found.status === 'BLOCKED') return { stop: 'blocked', detail: found ? found.summary : 'the developer did not finish the investigation' }
    if (questionsOf(found).length) return { stop: 'questions', questions: found.questions }
    if (!found.isBug) return { stop: 'not_a_bug', reason: found.summary }
    if (!found.bugTests.length) return { stop: 'blocked', detail: 'the investigation names no test that covers the bug' }
    const red = await guard(`red-run-${i}`, `Run \`${found.testCommand}\`. The bug is not fixed yet, so some of these tests must fail. Return the exit code, and in summary each failing test with the first line of its error. At most 60 lines.`, RUN)
    if (red && red.exitCode !== 0) return { ...found, red: red.summary }
    if (i >= MAX_RED) return { stop: 'blocked', detail: `after ${MAX_RED} tries, no test fails on the buggy code` }
    found = await agent(
      `${CONTEXT}\n\nThe tests you named (${found.bugTests.join(', ')}) all pass with \`${found.testCommand}\` on the buggy code, so they do not catch the bug. Write or correct the tests so that they fail because of this bug, then return your investigation again, updating ${INVESTIGATION}. Do not fix the bug yet.`,
      { label: `developer:red-${i}`, phase: 'Investigate', agentType: 'levi-developer', schema: INVESTIGATE },
    )
  }
}

// ---- run both at the same time ----

phase('Investigate')
const base = await guard('baseline', 'Run `git rev-parse HEAD` (use "none" when the repository has no commit yet) and `git status --porcelain`. Return the commit as head and the paths listed by git status as dirty.', BASE)
const scenariosReady = qaScenarios()
const inv = await investigate()
if (inv.stop === 'questions') return { status: 'questions', stage: 'investigation', questions: inv.questions }
if (inv.stop === 'not_a_bug') return { status: 'not_a_bug', reason: inv.reason }
if (inv.stop) return { status: 'blocked', stage: 'investigation', detail: inv.detail }

// A bug is a defect in code already merged into the base branch. A defect in work that is not merged
// yet (a branch under review, uncommitted changes) is a revision of that work, not a bug.
if (!A.allMerged) {
  if (!inv.locations.length) return { status: 'blocked', stage: 'merge check', detail: 'the investigation gives no location for the root cause' }
  const merged = await guard(
    'merged-check',
    `Check whether the code at these locations is merged into \`${A.base}\`:\n${inv.locations.map((l) => `- ${l.file} lines ${l.from}-${l.to}`).join('\n')}\nFor each location, run \`git blame --porcelain -L <from>,<to> -- <file>\` and collect the commit of every line. A line whose commit is all zeros is uncommitted, so not merged. For every other commit, run \`git merge-base --is-ancestor <commit> ${A.base}\`: exit 0 means merged, 1 means not merged. A file git does not track is not merged. List in unmerged every location with at least one line that is not merged, and why.`,
    MERGED,
  )
  if (!merged) return { status: 'blocked', stage: 'merge check', detail: 'the check against the base branch did not complete' }
  if (merged.unmerged.length) return { status: 'unmerged', rootCause: inv.rootCause, unmerged: merged.unmerged }
}

const lockedTests = await guard('lock-tests', `Run \`${LOCK} lock ${LOCK_TESTS} ${inv.bugTests.join(' ')}\` and return its exit code, and its output as summary.`, RUN)
if (!lockedTests || lockedTests.exitCode !== 0) return { status: 'blocked', stage: 'lock', detail: lockedTests ? lockedTests.summary : 'the tests could not be locked' }

const RULES = `Locked files: the tests ${inv.bugTests.join(', ')} and the scenarios in ${SCENARIOS}. They are the definition of done. Never edit, delete, rename, skip or weaken any of them, and never change test configuration to leave them out. A locked file you change is restored automatically and your work is wasted. When a test fails, the code is wrong: fix the code, at the root cause, without special-casing test inputs.`

// ---- Fix: fix, tests, review, E2E, until the review approves and every scenario passes ----

phase('Fix')
const gate = () =>
  guard(
    'gate',
    [
      `1. Run \`${LOCK} verify ${LOCK_TESTS}\` and put the paths it lists under "restored" into restored (empty list when intact).`,
      `2. Run \`${inv.testCommand}\` and record its exit code as testsExit.`,
      inv.suiteCommand && inv.suiteCommand !== inv.testCommand
        ? `3. Run \`${inv.suiteCommand}\` and record its exit code as suiteExit.`
        : '3. There is no separate suite: set suiteExit to testsExit.',
      'In failures, summarize every failing or erroring test: file, test name, and the first lines of the error. At most 80 lines. Empty when everything passed.',
    ].join('\n'),
    GATE,
  )
const verifyScenarios = () => guard('scenario-check', `Run \`${LOCK} verify ${LOCK_SCENARIOS}\` and return its exit code, and its output as summary.`, RUN)

let todo = `Fix the bug as planned in ${INVESTIGATION}. Fix the cause, not the symptom, everywhere it occurs, and keep the change as small as the fix allows.`
let scenarios = null
let last = null
for (let round = 1; round <= MAX_ROUNDS; round++) {
  log(`round ${round}`)
  const fixed = await agent(
    `${CONTEXT}\nInvestigation: ${INVESTIGATION}\n\n${todo}\n\n${RULES}\nWhen done, run \`${inv.testCommand}\`${inv.suiteCommand ? ` and \`${inv.suiteCommand}\`` : ''} and report the real result.`,
    { label: `developer:fix-${round}`, phase: 'Fix', agentType: 'levi-developer', schema: FIXED },
  )
  if (!fixed || fixed.status === 'BLOCKED') return { status: 'blocked', stage: 'fix', detail: fixed ? fixed.blockers : ['the fix did not complete'] }

  // Unit and feature tests must pass before the review.
  const g = await gate()
  if (!g) return { status: 'blocked', stage: 'tests', detail: 'the test run did not complete' }
  if (g.restored.length || g.testsExit !== 0 || g.suiteExit !== 0) {
    const tampered = g.restored.length ? `\nThese locked tests had been changed and were restored: ${g.restored.join(', ')}. Never touch them.` : ''
    last = { stage: 'tests', failures: g.failures, restored: g.restored }
    todo = `The unit and feature tests do not pass yet. Fix the code so that they do:\n${g.failures || 'the test run failed'}${tampered}`
    continue
  }

  const review = await agent(
    `${CONTEXT}\nInvestigation: ${INVESTIGATION}

Review the developer's fix of this bug. The change is everything that differs from commit ${base.head} (git diff and untracked files), leaving out files that were already modified before the run: ${base.dirty.join(', ') || 'none'}.
The unit and feature tests pass. They are locked: do not propose changing them.
Check that the fix removes the root cause rather than the symptom, everywhere it occurs; that it does what the spec, the designs and the confirmed points expect; that it breaks nothing else; and its security (input validation, authorization, secrets), performance and fit with the architecture and conventions.
Follow ${REVIEW_GUIDE} and the two checklists next to it (security by OWASP Top 10, performance and correctness), but write the findings where and how this prompt says.
Write ${REVIEW}: findings graded critical / warning / suggestion, each with the file, the problem and a concrete fix. Approve only when no critical or warning finding remains; suggestions alone do not block.`,
    { label: `teamlead:review-${round}`, phase: 'Fix', agentType: 'levi-teamlead', schema: CODE_REVIEW },
  )
  if (!review) return { status: 'blocked', stage: 'review', detail: 'the review did not complete' }
  const blocking = review.findings.filter((f) => f.severity !== 'suggestion')
  if (!review.approved || blocking.length) {
    last = { stage: 'review', findings: blocking }
    todo = `The teamlead's review (${REVIEW}) asks for these changes. Make them:\n${blocking.map((f) => `- [${f.severity}] ${f.file}: ${f.problem} Fix: ${f.fix}`).join('\n')}`
    continue
  }

  // The review approved: QA runs its scenarios end to end.
  if (!scenarios) {
    scenarios = await scenariosReady
    if (!scenarios) return { status: 'blocked', stage: 'scenarios', detail: 'QA did not finish the scenarios' }
    if (scenarios.stop === 'questions') return { status: 'questions', stage: 'scenarios', questions: scenarios.questions }
    if (scenarios.stop) return { status: 'blocked', stage: 'scenarios', detail: scenarios.detail }
  }
  const e2e = (note) =>
    agent(
      `${CONTEXT}

The fix of this bug was approved in review. Run every scenario in ${SCENARIOS} (there are ${scenarios.scenarioCount}) against the running app, end to end, ${
        inv.hasUi ? "in a headless browser: the project's E2E runner (such as Playwright) or a browser tool you have" : 'through its API or CLI'
      }. Start the app with \`${inv.app.start}\` (${inv.app.url}; ${inv.app.notes}) and stop it when you are done.
Follow each scenario's steps as written and compare with its Expected. Set its Status to PASS or FAIL and its Evidence to what you observed (for FAIL: actual against expected, and the error). Set the Status at the top of the file to "<passed>/${scenarios.scenarioCount} PASS".
Change nothing else in the file and no application code. A scenario you could not run is FAIL, with the reason: untested is not passed.${note ? `\n\n${note}` : ''}`,
      { label: `qa:e2e-${round}`, phase: 'Fix', agentType: 'levi-qa', schema: E2E },
    )
  let run = await e2e()
  let check = await verifyScenarios()
  if (check && check.exitCode !== 0) {
    log('the scenarios were changed during E2E and were restored; running E2E again')
    run = await e2e('The scenario file had been changed during the last run and was restored. Only the Status and Evidence lines may change.')
    check = await verifyScenarios()
    if (check && check.exitCode !== 0) return { status: 'blocked', stage: 'e2e', detail: 'QA changed the locked scenarios twice' }
  }
  if (!run) return { status: 'blocked', stage: 'e2e', detail: 'the E2E run did not complete' }
  const failing = []
  for (let n = 1; n <= scenarios.scenarioCount; n++) {
    const r = run.results.find((x) => x.n === n)
    if (!r || r.result !== 'PASS') failing.push(`scenario ${n}: ${r ? r.evidence : 'not run'}`)
  }
  if (!failing.length) {
    return {
      status: 'done',
      rounds: round,
      rootCause: inv.rootCause,
      tests: inv.bugTests,
      wroteTests: inv.wroteTests,
      testCommand: inv.testCommand,
      scenarios: { file: SCENARIOS, count: scenarios.scenarioCount },
      review: review.summary,
      suggestions: review.findings.filter((f) => f.severity === 'suggestion'),
    }
  }
  last = { stage: 'e2e', failing }
  todo = `QA ran the scenarios in ${SCENARIOS} end to end after the review, and these failed. Fix the code so that they pass:\n${failing.join('\n')}`
}

return { status: 'stalled', rounds: MAX_ROUNDS, last }
