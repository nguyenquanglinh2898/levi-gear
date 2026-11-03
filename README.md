# levi-gear

**Gather a whole software team into your terminal.** levi is an agentic kit that breathes a complete crew into Claude Code: a product manager, a teamlead, a developer, a designer and a QA engineer, each with a clear craft and a clear territory. Write a workflow once, and it comes alive as native Claude Code skills and subagents.

## Why levi

- **Built for Claude Code.** A usecase is written once and installed as native Claude Code skills and subagents.
- **A team, not a lone assistant.** Five role agents, each owning only its own files, pass work to one another through plain files in a shared work folder, so every hand-off leaves a trail you can read.
- **Craft from idea to release.** Seven ready usecases carry work from a vague idea to a verified result: brainstorming, spec writing, design, test-first feature building, bug fixing, code review and test scenarios.
- **Tests that cannot be bent.** In `create-feature` and `fix-bug` the tests come first and are locked, and QA writes its test cases from the spec alone, so the code is fixed until the proof passes.
- **Ask once, then run alone.** All questions are gathered up front; afterwards the run proceeds without you, picks cheap-to-change options on its own and lays them out in a closing report so you can change any of them.
- **A run that outlasts the quota.** When the 5-hour usage window runs dry, the run resumes itself once it refills, with its context kept, instead of stopping half-way.
- **Quiet until called.** levi never acts on its own; a prompt without the levi command is handled by Claude Code as usual. `/levi <request>` routes a request, in any language, to the best matching usecase.
- **Your files stay yours.** Everything installed is a plain file in your repository. `levi update` refreshes only what you did not touch and never overwrites your edits.
- **Featherlight.** No runtime dependencies; Node.js 18 or newer is all it asks for.

**Full documentation: [docs/](docs/README.md)**: installation, usage, updating, the CLI reference and more.

## Install into a project

```bash
npx levi-gear@latest init                      # all usecases
npx levi-gear@latest init brainstorming        # only some usecases
```

Installed files are recorded in `.levi.json`. Commit the generated folders and `.levi.json` so teammates get everything by cloning.

## Commands

| Command | What it does |
|---|---|
| `levi init [usecase...]` | Install usecases (all by default) |
| `levi update [--force [path...]]` | Refresh installed files to this package version, keeping files you changed |
| `levi status` | Show what `update` would do, without changing anything |
| `levi list` | List usecases in the kit and print how to invoke them |

## Using it

levi only runs when you ask for it. A prompt that does not start with the levi command is handled by Claude Code as usual.

| Let levi pick the usecase | Call a usecase directly |
|---|---|
| `/levi <request>` | `/levi-<usecase> <request>` |

`levi <request>` is an entry point generated at install time from the installed usecases. It matches the request (in any language) against each usecase description, runs the best match (naming the runner-up when it was close, so you can call that one directly), and tells you when none fits.

## The team

Every install includes the team agents from `agents/`. Usecases delegate to them; they never run on their own and never call each other.

| Agent | Responsibilities | Owns | Called by |
|---|---|---|---|
| `levi-pm` | Writes and updates specs with checkable acceptance criteria (the only role that touches specs); frames problems; decides scope and priority; assigns each task an owner; approves plans against the spec; accepts the product on test evidence and writes release notes | `spec.md`, `docs/specs/`, `status.md`, `docs/brainstorming/` | `spec-writing`, `brainstorming`, `create-feature` |
| `levi-teamlead` | Designs the architecture and picks the technology; designs the database schema and migrations; sets structure, conventions and API contracts; breaks work into tasks with estimates; reviews code (security by OWASP Top 10, performance and correctness) with a fix for every finding; owns CI/CD | `architecture.md`, `tasks.md`, `review.md`, schema, migrations, CI/CD and deployment config | `brainstorming`, `create-feature`, `fix-bug`, `code-review` |
| `levi-developer` | Implements tasks as designed; investigates and fixes bugs at the root cause; writes unit and integration tests; runs build, lint and tests before handing off | Application code, unit and integration tests, technical docs of the code | `create-feature`, `fix-bug` |
| `levi-designer` | Maps user flows and wireframes; draws screens in SVG and HTML prototypes; defines design tokens and every state; covers responsive behavior and accessibility; writes handoff notes | `docs/designs/` | `design`, `create-feature` (for UI work) |
| `levi-qa` | Writes test plans and test cases from the spec, without reading the code, as Markdown and Excel (only QA changes them); runs E2E tests in a headless browser; writes E2E and acceptance tests; reports bugs and gives the go or no-go | `test-plan.md`, `docs/tests/`, `test-report.md`, E2E and acceptance tests | `create-feature`, `fix-bug`, `generate-test-scenarios` |

Each agent does only its own role's work and writes only the files it owns; work for another role is handed off. The full role descriptions are in [docs/team.md](docs/team.md).

Some usecases are also a role's skill: `spec-writing` for the PM, `design` for the designer, `code-review` for the teamlead and `generate-test-scenarios` for QA. They are installed with every install, and the agent follows that skill's guide whenever it gets that kind of task, from any usecase. A usecase declares this with `skill-for`, `skill-when` and `skill-guide` in its `SKILL.md`.

The usecase's skill or workflow runs the team: it calls each member in turn. The PM only decides who owns each task and records it; the workflow follows that. Members hand work to each other through files in a work folder (`docs/levi/<slug>/` by default): `spec.md`, `status.md`, `docs/designs/`, `architecture.md`, `tasks.md`, `review.md`, `test-plan.md`, `test-report.md`. The shared rules live in `agents/_team-protocol.md`, which is appended to every team agent. Every usecase also follows the run rules in `usecases/_run-rules.md`, appended to each installed `SKILL.md`: all questions are asked up front, cheap-to-change choices are picked and reported at the end, and a run that hits the 5-hour quota resumes itself with its context kept ([docs/unattended-runs.md](docs/unattended-runs.md)).

## Update

```bash
npx levi-gear@latest update
```

The installed files are yours: edit them to fit your project. `update` never overwrites or deletes a file you changed. At install time levi records a hash of every file it writes in `.levi.json` (commit it), and `update` compares each file with that hash:

| State of the file | What `update` does |
|---|---|
| Untouched | Replaces it with the new version, or deletes it if the kit dropped it |
| You changed it | Keeps your file and ignores the kit's version |
| You deleted it | Does not recreate it |
| New in the kit | Adds it |
| Path already exists and was not written by levi | Keeps your file and ignores the kit's version |

`levi status` shows what `update` would do without changing anything. To take the kit version of a file you customized, run `levi update --force <path>` (or `--force` alone for all of them).

levi does not merge: a file you changed is yours from then on and stops receiving kit updates until you run `--force` on it.

## Where things go

| Skill | Subagents |
|---|---|
| `.claude/skills/levi/`, `.claude/skills/levi-<usecase>/` | `.claude/agents/levi-<usecase>-<role>.md` |

## Authoring a usecase

```
usecases/<id>/
  SKILL.md              # entry point; frontmatter name: levi-<id>, description
  references/, scripts/ # optional, copied along with the skill
  agents/<role>.md      # optional subagents; frontmatter name: levi-<id>-<role>, description
                        # optional skill-for, skill-when, skill-guide: the skill of a team role
agents/<role>.md        # team agents shared by all usecases; frontmatter name: levi-<role>
agents/_*.md            # partials appended to every team agent
```

Agent frontmatter (usecase and team agents alike):

| Field | Values | Claude Code |
|---|---|---|
| `name`, `description` | required | as is |
| `tools` | comma list of `read`, `edit`, `execute`, `web`; omit for the defaults | `Read, Grep, Glob` / `Edit, Write` / `Bash` / `WebFetch, WebSearch` |
| `model` | `strong`, `standard`, `fast`; omit to inherit | `opus` / `sonnet` / `haiku` |

An explicit `tools` list also cuts off MCP tools, so leave it out for agents that need a browser or other MCP servers.

- Every usecase is manual-only: the installer sets `disable-model-invocation: true` in the installed `SKILL.md`, so Claude Code never triggers it by itself.
- The `description` in `SKILL.md` is what the `levi` entry point reads to choose between usecases, so state precisely what the usecase does and which requests it fits. English is fine; requests in other languages are matched by meaning.
- The entry point reads a chosen usecase's `SKILL.md` directly, because manual-only skills cannot be called through a skill tool. Keep the workflow in that file.
- The installer appends a note to each subagent description so Claude Code delegates to it only through its usecase.
- Delegate to team agents by name (`levi-pm`, `levi-qa`, ...) from the usecase's `SKILL.md`, and name the work folder they should use. A usecase id must not reuse a team role name.
- Write everything in the repo in English: usecase files, code, comments and docs. Requests to the entry point can still be in any language.
- Test in a scratch project with `node /path/to/levi-gear/bin/levi.js init`, then `npm version <patch|minor>` and `npm publish`.

## Customize

Edit the installed files directly, for example `.claude/agents/levi-qa.md` to add your project's test conventions. `update` keeps them (see Update). To keep a file out of levi's control entirely, copy it to a name without the `levi-` prefix. A copy is not managed by levi: it is not manual-only unless you set that yourself, and `/levi` does not list it.

## Contributing

Commit messages, branch names and pull requests are written in English, using short conventional prefixes (`feat:`, `fix:`, `docs:`).

## Status

Checked in Claude Code 2.1.276:

- The installed skills and agents are picked up.
- A prompt without the levi command does not use levi.
- `/levi` routes a request to the matching usecase.
- The team agents run when a usecase delegates to them (the full `brainstorming` flow runs).
