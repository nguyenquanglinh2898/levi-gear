export const meta = {
  name: 'levi-create-feature',
  description: 'Implement a feature test-first: tests and QA scenarios from the spec, reviewed and locked, then code until every test passes, the teamlead approves the review and every E2E scenario passes',
  whenToUse: 'Started by the levi-create-feature skill once the spec, the brainstorming plan and the designs are ready',
  phases: [
    { title: 'Plan', detail: 'the teamlead turns the brainstorming plan into an execution plan' },
    { title: 'Tests', detail: 'developer tests and QA scenarios, written apart and reviewed against the spec' },
    { title: 'Lock', detail: 'snapshot and hash the tests, and snapshot the test cases as QA wrote them' },
    { title: 'Build', detail: 'implement, run the tests, review, then E2E; repeat until the review approves and every scenario passes' },
  ],
}

// args: { slug, feature, spec, plan, designs?, featureId?, testBase?, skillDir, maxRounds? } — see the skill's SKILL.md.
const A = args || {}
const absent = ['slug', 'feature', 'spec', 'plan', 'skillDir'].filter((k) => !A[k])
if (absent.length) return { status: 'error', message: `missing args: ${absent.join(', ')}` }

const WORK = `docs/levi/${A.slug}`
const TASKS = `${WORK}/tasks.md`
const REVIEW = `${WORK}/review.md`
// QA's test cases, written and run with the test case guide of levi-generate-test-scenarios.
const FEATURE_ID = A.featureId || A.slug.toUpperCase()
const TEST_BASE = A.testBase || `docs/tests/${A.slug}-test-cases`
const SCENARIOS = `${TEST_BASE}.md`
const SCENARIO_FILES = [SCENARIOS, `${TEST_BASE}.xlsx`]
const CASES = `${WORK}/test-cases.json`
const TEST_GUIDE = `${A.skillDir}/../levi-generate-test-scenarios/references/test-case-guide.md`
const LOCK_DIR = `${WORK}/locked`
// Only QA changes its test cases: a snapshot taken after each QA step restores changes made by anyone else.
const QA_SNAPSHOT = `${WORK}/qa-snapshot`
const LOCK = `node ${A.skillDir}/scripts/lock-tests.mjs`
const REVIEW_GUIDE = `${A.skillDir}/../levi-code-review/references/review-guide.md`
const MAX_TEST_REVIEWS = 5
const MAX_BUILD_ROUNDS = A.maxRounds || 10

const CONTEXT = [
  `Feature: ${A.feature}`,
  `Spec, the single source of truth for what is expected: ${A.spec}`,
  `Brainstorming plan: ${A.plan}`,
  `Designs: ${A.designs || 'none'}`,
  `Work folder: ${WORK}`,
].join('\n')

const LOCKED_RULES = (tests) => `The test cases in ${SCENARIO_FILES.join(' and ')} belong to QA: do not edit them; a change by anyone else is undone. Locked files: the tests (${tests.join(', ')}). They were checked against the spec and are the definition of done. Never edit, delete, rename, skip or weaken any of them, and never change test configuration to leave them out. A locked file you change is restored automatically and your work is wasted. When a test fails, the code is wrong: fix the code, at the root cause, without special-casing test inputs.`

// ---- schemas ----

const STATUS = { type: 'string', enum: ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'] }
const QUESTIONS = {
  type: 'array',
  items: { type: 'string' },
  description: 'Questions only the user can answer, because the spec is silent, unclear or contradictory on a point that changes the work. Empty when none.',
}
const STRINGS = { type: 'array', items: { type: 'string' } }
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties) })

const PLAN = obj({
  status: STATUS,
  summary: { type: 'string' },
  criteria: { ...STRINGS, description: 'Every acceptance criterion ID in the spec' },
  hasUi: { type: 'boolean' },
  testSetup: { type: 'string', description: 'What must be installed or configured before unit and feature tests can run; empty when nothing' },
  testCommand: { type: 'string', description: 'Shell command, from the project root, that runs only the new unit and feature tests of this feature' },
  suiteCommand: { type: 'string', description: 'Shell command that runs the whole existing test suite; empty when the project has none' },
  app: obj({ start: { type: 'string' }, url: { type: 'string' }, notes: { type: 'string' } }),
  testGroups: {
    type: 'array',
    items: obj({ id: { type: 'string' }, area: { type: 'string' }, criteria: STRINGS, location: { type: 'string' } }),
  },
  batches: {
    type: 'array',
    description: 'Implementation batches in order. Tasks in one batch run in parallel and must not touch the same files',
    items: {
      type: 'array',
      items: obj({
        id: { type: 'string' },
        title: { type: 'string' },
        owner: { type: 'string', enum: ['levi-developer', 'levi-teamlead'] },
        criteria: STRINGS,
        areas: { type: 'string' },
      }),
    },
  },
  questions: QUESTIONS,
})

const WRITTEN = obj({ status: STATUS, summary: { type: 'string' }, files: STRINGS, scenarioCount: { type: 'integer' }, questions: QUESTIONS })

const SPEC_REVIEW = obj({
  approved: { type: 'boolean' },
  issues: {
    type: 'array',
    items: obj({ file: { type: 'string' }, criterion: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } }),
  },
  testCommand: { type: 'string', description: 'The command that runs exactly these tests; empty for scenarios' },
  questions: QUESTIONS,
})

const RUN = obj({ exitCode: { type: 'integer' }, summary: { type: 'string' } })
const GATE = obj({ restored: STRINGS, testsExit: { type: 'integer' }, suiteExit: { type: 'integer' }, failures: { type: 'string' } })
const BASE = obj({ head: { type: 'string' }, dirty: STRINGS })
const E2E = obj({
  status: STATUS,
  summary: { type: 'string' },
  results: { type: 'array', items: obj({ id: { type: 'string' }, result: { type: 'string', enum: ['PASS', 'FAIL'] }, evidence: { type: 'string' } }) },
})
const IMPL = obj({ status: STATUS, summary: { type: 'string' }, files: STRINGS, blockers: STRINGS })
const CODE_REVIEW = obj({
  approved: { type: 'boolean' },
  summary: { type: 'string' },
  findings: {
    type: 'array',
    items: obj({
      severity: { type: 'string', enum: ['critical', 'warning', 'suggestion'] },
      owner: { type: 'string', enum: ['levi-developer', 'levi-teamlead'] },
      file: { type: 'string' },
      problem: { type: 'string' },
      fix: { type: 'string' },
    }),
  },
})

// ---- helpers ----

// Mechanical steps (git, the lock script, running tests) go to a plain agent that only runs commands.
const guard = (label, prompt, schema) =>
  agent(`${prompt}\n\nRun the commands from the project root. Do not create, edit or delete any file yourself, and do not try to fix anything. Report only what you observed.`, {
    label,
    schema,
    effort: 'low',
  })

const runGate = (testCommand, suiteCommand) =>
  guard(
    'gate',
    [
      `1. Run \`${LOCK} verify ${LOCK_DIR}\` and put the paths it lists under "restored" into restored (empty list when intact).`,
      `2. Run \`${testCommand}\` and record its exit code as testsExit.`,
      suiteCommand && suiteCommand !== testCommand
        ? `3. Run \`${suiteCommand}\` and record its exit code as suiteExit.`
        : '3. There is no separate suite: set suiteExit to testsExit.',
      'In failures, summarize every failing or erroring test: file, test name, and the first lines of the error. At most 80 lines. Empty when everything passed.',
    ].join('\n'),
    GATE,
  )

const questionsOf = (...results) => [...new Set(results.filter(Boolean).flatMap((r) => r.questions || []))]
const blocked = (results) => results.filter((r) => !r || r.status === 'BLOCKED')

// ---- 1. Plan ----

phase('Plan')
const base = await guard('baseline', 'Run `git rev-parse HEAD` (use "none" when the repository has no commit yet) and `git status --porcelain`. Return the commit as head and the paths listed by git status as dirty.', BASE)

let plan = await agent(
  `${CONTEXT}

You are starting the implementation of this feature. Read the spec, the brainstorming plan, the designs and the project, then:

1. Write ${TASKS}: the execution plan the team follows. It holds the interfaces the tests and the code share (modules, functions, endpoints, routes, components, data shapes, with exact names), the test framework and where tests go, and the implementation tasks taken from the brainstorming plan. Keep the owners the plan gives; only development work goes into the batches (spec, design, QA and acceptance work is handled elsewhere). Database schema, migrations and CI/CD tasks are yours (levi-teamlead); application code is levi-developer's.
2. Return the execution plan as structured data:
   - criteria: every acceptance criterion ID in the spec.
   - testGroups: split the unit and feature tests into groups that can be written in parallel, each with the criteria it covers and the folder where the project's framework expects those tests. Every criterion belongs to at least one group.
   - batches: the implementation tasks in dependency order. Tasks in one batch run in parallel in the same working tree, so they must not touch the same files.
   - testSetup when the project cannot run unit and feature tests yet (pick the framework that fits the stack), testCommand, suiteCommand, and how to start the app for end-to-end tests (app.start, app.url, app.notes, including seed data or env it needs).
   Ask in questions only what the spec cannot answer.`,
  { label: 'teamlead:plan', agentType: 'levi-teamlead', schema: PLAN },
)
for (let i = 0; plan && i < 2; i++) {
  const grouped = new Set(plan.testGroups.flatMap((g) => g.criteria))
  const uncovered = plan.criteria.filter((c) => !grouped.has(c))
  if (!uncovered.length) break
  log(`criteria with no test group: ${uncovered.join(', ')}; asking the teamlead to fix the plan`)
  plan = await agent(
    `${CONTEXT}\n\nYour execution plan in ${TASKS} leaves these acceptance criteria out of every test group: ${uncovered.join(', ')}. Put each into a test group, update ${TASKS}, and return the whole corrected plan.`,
    { label: 'teamlead:plan-fix', agentType: 'levi-teamlead', schema: PLAN },
  )
}
if (!plan || plan.status === 'BLOCKED') return { status: 'blocked', stage: 'plan', detail: plan ? plan.summary : 'the teamlead did not return a plan' }
if (questionsOf(plan).length) return { status: 'spec_questions', stage: 'plan', questions: questionsOf(plan) }

if (plan.testSetup) {
  const setup = await agent(
    `${CONTEXT}\n\nPrepare the project so that unit and feature tests can run, as the execution plan in ${TASKS} says: ${plan.testSetup}\nInstall and configure only that. Do not write any test or feature code yet. Check it by running \`${plan.testCommand}\` (no tests found is fine at this point).`,
    { label: 'developer:test-setup', agentType: 'levi-developer', schema: IMPL },
  )
  if (!setup || setup.status === 'BLOCKED') return { status: 'blocked', stage: 'test setup', detail: setup ? setup.blockers : [] }
}

// ---- 2. Tests and scenarios, written apart, each reviewed against the spec ----

phase('Tests')

async function developerTests() {
  const written = await parallel(
    plan.testGroups.map((g) => () =>
      agent(
        `${CONTEXT}

Write the unit tests and feature tests of test group ${g.id} (${g.area}). They cover acceptance criteria ${g.criteria.join(', ')}. Put them in ${g.location}, with the project's framework and conventions, against the interfaces in ${TASKS}.

- The spec is the only source of what is expected. Every assertion follows from the spec (and the design for UI): values, messages, status codes, states, the edge cases, invalid input, error cases and permissions it states. Do not assert anything the spec does not state.
- Every criterion of the group has at least one test, and each test names the criterion it covers (for example "AC-3: ...").
- The feature is not built yet, so these tests are expected to fail now. Do not write application code, stubs or fakes of the feature.
- Work from the spec alone: do not read ${SCENARIOS} or the tests of other groups. If files from an earlier run exist, bring them in line with the spec.
- After this step the tests are locked: the code will have to pass them and nobody may change them. Get them right now.

Return every test file you created or changed (helpers and fixtures included).`,
        { label: `developer:tests-${g.id}`, phase: 'Tests', agentType: 'levi-developer', schema: WRITTEN },
      ),
    ),
  )
  if (blocked(written).length) return { stop: 'blocked', detail: written.map((w) => w && w.summary) }
  let questions = questionsOf(...written)
  if (questions.length) return { stop: 'spec_questions', questions }
  const files = [...new Set(written.flatMap((w) => w.files))]
  let testCommand = plan.testCommand

  for (let i = 1; i <= MAX_TEST_REVIEWS; i++) {
    const red = await guard(`red-run-${i}`, `Run \`${testCommand}\`. These tests were written before the feature exists, so failures are expected. Return the exit code, and in summary the result of each test (pass, fail or error) with the first line of each error. At most 80 lines.`, RUN)
    const review = await agent(
      `${CONTEXT}

Review the unit and feature tests of this feature against the spec, as an independent reviewer: ${files.join(', ')}. Interfaces: ${TASKS}.
Result of running them before any implementation exists (exit ${red ? red.exitCode : '?'}):
${red ? red.summary : 'not available'}

Check that:
- every acceptance criterion in ${plan.criteria.join(', ')} is covered;
- every assertion follows from the spec (and the design) exactly, and nothing asserts behavior the spec does not state;
- each test can fail on a real bug; a test that already passes without the feature needs a real reason;
- they use the project's framework and the interfaces in ${TASKS}, and one command runs exactly these tests (return it as testCommand).

The tests belong to the developer: do not edit them. Approve only when nothing is left to change.`,
      { label: `teamlead:review-tests-${i}`, phase: 'Tests', agentType: 'levi-teamlead', schema: SPEC_REVIEW },
    )
    if (!review) return { stop: 'blocked', detail: 'the test review did not complete' }
    if (review.testCommand) testCommand = review.testCommand
    questions = questionsOf(review)
    if (questions.length) return { stop: 'spec_questions', questions }
    if (review.approved) return { files, testCommand }
    const fixed = await agent(
      `${CONTEXT}\n\nThe review of your unit and feature tests against the spec found these problems. Fix each one in the tests, and only these:\n${JSON.stringify(review.issues, null, 2)}\nThe spec decides. Do not write application code. Return every test file of the feature (${files.join(', ')}, plus any you add).`,
      { label: `developer:fix-tests-${i}`, phase: 'Tests', agentType: 'levi-developer', schema: WRITTEN },
    )
    if (fixed) fixed.files.forEach((f) => files.includes(f) || files.push(f))
  }
  return { stop: 'blocked', detail: `the tests were not approved after ${MAX_TEST_REVIEWS} reviews` }
}

async function qaScenarios() {
  let written = await agent(
    `${CONTEXT}

Write the test cases of this feature, following your test case guide, ${TEST_GUIDE} ("The source rule" and "Writing test cases").

Sources (your only ones): the spec ${A.spec}${A.designs ? ` and the designs in ${A.designs}` : ''}. Do not read the application code or the developer's tests.
Feature ID: ${FEATURE_ID}
Cases file: ${CASES}
Output base: ${TEST_BASE}. If its files exist from an earlier run, they are yours: get the cases back as the guide's "Changing test cases" says and bring them in line with the spec.

On top of the guide:
- Every acceptance criterion in ${plan.criteria.join(', ')} is in the refs of at least one case.
- Each case can be run end to end ${plan.hasUi ? 'in a browser' : 'through the API or the CLI'} by someone who has only the rendered file and the running app (${plan.app.url}).
- Do not record results: they are recorded when the cases are run, after the code is built.
- The spec is Ready, so it should settle everything a case needs. Put every ambiguity you find into questions as well.

Return the number of cases as scenarioCount.`,
    { label: 'qa:scenarios', phase: 'Tests', agentType: 'levi-qa', schema: WRITTEN },
  )
  if (!written || written.status === 'BLOCKED') return { stop: 'blocked', detail: written ? written.summary : 'QA did not write the scenarios' }
  let questions = questionsOf(written)
  if (questions.length) return { stop: 'spec_questions', questions }

  for (let i = 1; i <= MAX_TEST_REVIEWS; i++) {
    const review = await agent(
      `${CONTEXT}

Review the test cases in ${SCENARIOS} against the spec, as an independent reviewer. Check that:
- every acceptance criterion in ${plan.criteria.join(', ')} is covered by at least one case (its Notes name the criteria it traces to);
- every Expected Result matches the spec exactly, and no case expects behavior the spec does not state;
- each case can be run end to end from the file alone.

The file belongs to QA: do not edit it. Approve only when nothing is left to change.`,
      { label: `pm:review-scenarios-${i}`, phase: 'Tests', agentType: 'levi-pm', schema: SPEC_REVIEW },
    )
    if (!review) return { stop: 'blocked', detail: 'the scenario review did not complete' }
    questions = questionsOf(review)
    if (questions.length) return { stop: 'spec_questions', questions }
    if (review.approved) return { scenarioCount: written.scenarioCount }
    written =
      (await agent(
        `${CONTEXT}\n\nThe review of ${SCENARIOS} against the spec found these problems. Fix each one, and only these, as your test case guide (${TEST_GUIDE}, "Changing test cases") says, with the cases file ${CASES} and the output base ${TEST_BASE}:\n${JSON.stringify(review.issues, null, 2)}\nThe spec decides. Return the number of cases as scenarioCount.`,
        { label: `qa:fix-scenarios-${i}`, phase: 'Tests', agentType: 'levi-qa', schema: WRITTEN },
      )) || written
  }
  return { stop: 'blocked', detail: `the scenarios were not approved after ${MAX_TEST_REVIEWS} reviews` }
}

const [tests, scenarios] = await parallel([developerTests, qaScenarios])
for (const [stage, r] of [['tests', tests], ['scenarios', scenarios]]) {
  if (!r) return { status: 'blocked', stage, detail: 'the step did not complete' }
  if (r.stop === 'spec_questions') return { status: 'spec_questions', stage, questions: r.questions }
  if (r.stop) return { status: 'blocked', stage, detail: r.detail }
}

// ---- 3. Lock ----

phase('Lock')
const snapshotScenarios = () => guard('qa-snapshot', `Run \`${LOCK} lock ${QA_SNAPSHOT} ${SCENARIO_FILES.join(' ')}\` and return its exit code, and its output as summary.`, RUN)
const restoreScenarios = () => guard('qa-restore', `Run \`${LOCK} verify ${QA_SNAPSHOT}\` and return its exit code, and its output as summary.`, RUN)
const locked = await guard('lock', `Run \`${LOCK} lock ${LOCK_DIR} ${tests.files.join(' ')}\` and return its exit code, and its output as summary.`, RUN)
if (!locked || locked.exitCode !== 0) return { status: 'blocked', stage: 'lock', detail: locked ? locked.summary : 'the lock step did not complete' }
const snapped = await snapshotScenarios()
if (!snapped || snapped.exitCode !== 0) return { status: 'blocked', stage: 'lock', detail: snapped ? snapped.summary : 'the test cases could not be snapshotted' }
log(`locked ${tests.files.length} test file(s); ${scenarios.scenarioCount} test case(s) kept as QA wrote them`)

// ---- 4. Build: implement, tests, review, then E2E, until the review approves and every scenario passes ----

const RULES = LOCKED_RULES(tests.files)

async function implement() {
  for (const [b, batch] of plan.batches.entries()) {
    const done = await parallel(
      batch.map((t) => () =>
        agent(
          `${CONTEXT}

Implement task ${t.id}: ${t.title}. Areas: ${t.areas}. Acceptance criteria: ${t.criteria.join(', ') || 'see the task'}. Follow ${TASKS}, the spec, the designs and the project's conventions.
Other tasks of this batch run at the same time in the same working tree: touch only the areas of your task.
${RULES}
Before finishing, run the tests that cover your task and report the real result.`,
          { label: `${t.owner.replace('levi-', '')}:${t.id}`, phase: 'Build', agentType: t.owner, schema: IMPL },
        ),
      ),
    )
    const stuck = blocked(done)
    if (stuck.length) return { blocked: `batch ${b + 1}`, detail: stuck.map((d) => (d ? d.blockers.join('; ') || d.summary : 'an agent did not complete')) }
  }
  return {}
}

async function fix(items) {
  for (const owner of ['levi-teamlead', 'levi-developer']) {
    const mine = items.filter((f) => f.owner === owner)
    if (!mine.length) continue
    const done = await agent(
      `${CONTEXT}

Fix the code so that the following pass. Each item says where it comes from (unit and feature tests, end-to-end scenarios, or the code review):
${mine.map((f) => `- [${f.source}] ${f.detail}`).join('\n')}

${RULES}
Before finishing, run \`${tests.testCommand}\` and report the real result.`,
      { label: `${owner.replace('levi-', '')}:fix`, phase: 'Build', agentType: owner, schema: IMPL },
    )
    if (!done || done.status === 'BLOCKED') return { blocked: 'fix', detail: done ? done.blockers : ['the fix did not complete'] }
  }
  return {}
}

async function e2e(note) {
  return agent(
    `${CONTEXT}

The code was approved in review. Run every test case in ${SCENARIOS} (there are ${scenarios.scenarioCount}) against the running app and record the results, following your test case guide, ${TEST_GUIDE} ("Recording results"), with the cases file ${CASES} and the output base ${TEST_BASE}. Run them ${
      plan.hasUi
        ? "in a headless browser: the project's E2E runner (such as Playwright) or a browser tool you have"
        : 'through its API or CLI'
    }. Start the app with \`${plan.app.start}\` (${plan.app.url}; ${plan.app.notes}) and stop it when you are done.
Change no application code. Return the result of every case, by its ID.${note ? `\n\n${note}` : ''}`,
    { label: 'qa:e2e', phase: 'Build', agentType: 'levi-qa', schema: E2E },
  )
}

phase('Build')
let pending = null
let last = null
for (let round = 1; round <= MAX_BUILD_ROUNDS; round++) {
  log(`build round ${round}`)
  const step = pending ? await fix(pending) : await implement()
  if (step.blocked) return { status: 'blocked', stage: step.blocked, detail: step.detail }

  const gate = await runGate(tests.testCommand, plan.suiteCommand)
  if (!gate) return { status: 'blocked', stage: 'gate', detail: 'the test run did not complete' }
  const tampered = gate.restored.length ? ` These locked files had been changed and were restored: ${gate.restored.join(', ')}. Never touch them.` : ''
  if (gate.restored.length || gate.testsExit !== 0 || gate.suiteExit !== 0) {
    last = { stage: 'tests', failures: gate.failures, restored: gate.restored }
    pending = [{ owner: 'levi-developer', source: 'tests', detail: `${gate.failures || 'the test run failed'}${tampered}` }]
    continue
  }

  const review = await agent(
    `${CONTEXT}

Review the code change of this feature as the gate before merge. The change is everything that differs from commit ${base.head} (git diff and untracked files), leaving out files that were already modified before the run: ${base.dirty.join(', ') || 'none'}.
All unit and feature tests pass. The tests are locked and the test cases are QA's; both are correct by definition: do not propose changing them.
Check the change against the spec, ${TASKS} and the designs: correctness, security (input validation, authorization, secrets), performance, fit with the architecture and conventions, missing pieces.
Follow ${REVIEW_GUIDE} and the two checklists next to it (security by OWASP Top 10, performance and correctness), but write the findings where and how this prompt says.
Write ${REVIEW}: findings graded critical / warning / suggestion, each with the file, the problem, a concrete fix and its owner (levi-teamlead for schema, migrations and CI/CD, levi-developer for the rest). Approve only when no critical or warning finding remains; suggestions alone do not block.`,
    { label: `teamlead:review-${round}`, phase: 'Build', agentType: 'levi-teamlead', schema: CODE_REVIEW },
  )
  if (!review) return { status: 'blocked', stage: 'review', detail: 'the code review did not complete' }
  const blocking = review.findings.filter((f) => f.severity !== 'suggestion')
  if (!review.approved || blocking.length) {
    last = { stage: 'review', findings: blocking }
    pending = blocking.map((f) => ({ owner: f.owner, source: `review ${f.severity}`, detail: `${f.file}: ${f.problem} Fix: ${f.fix}` }))
    continue
  }

  // The review approved: QA runs the scenarios end to end.
  // Changes to the test cases by anyone but QA are undone before QA runs them; QA's own results are kept after.
  const restored = await restoreScenarios()
  if (restored && restored.exitCode !== 0) log('the test cases had been changed outside QA and were restored')
  const run = await e2e()
  if (!run) return { status: 'blocked', stage: 'e2e', detail: 'the E2E run did not complete' }
  await snapshotScenarios()
  const caseIds = Array.from({ length: scenarios.scenarioCount }, (_, i) => `TC-${FEATURE_ID}-${String(i + 1).padStart(3, '0')}`)
  const passed = new Set(run.results.filter((r) => r.result === 'PASS').map((r) => r.id))
  const failing = caseIds.filter((id) => !passed.has(id))
  if (!failing.length) {
    return {
      status: 'done',
      rounds: round,
      tests: tests.files,
      testCommand: tests.testCommand,
      scenarios: { files: SCENARIO_FILES, count: scenarios.scenarioCount },
      review: review.summary,
      suggestions: review.findings.filter((f) => f.severity === 'suggestion'),
    }
  }
  const evidence = failing.map((id) => {
    const r = run.results.find((x) => x.id === id)
    return `${id}: ${r ? r.evidence : 'not run'}`
  })
  last = { stage: 'e2e', failing, evidence }
  pending = [{ owner: 'levi-developer', source: 'E2E', detail: `failing test cases in ${SCENARIOS}:\n${evidence.join('\n')}` }]
}

return { status: 'stalled', rounds: MAX_BUILD_ROUNDS, last }
