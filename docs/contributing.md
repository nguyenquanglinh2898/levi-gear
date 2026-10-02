# Contributing

This page covers changes to levi itself: the CLI, the team agents and the usecases. To add a usecase or an agent, start with [Authoring usecases](authoring-usecases.md).

## Conventions

- Commit messages, branch names and pull requests are written in English, using short conventional prefixes: `feat:`, `fix:`, `docs:`.
- Everything in the repository is written in English: code, comments, usecase files and docs.
- No runtime dependencies. The CLI uses Node.js 18+ and its standard library only.

## Repository layout

```text
bin/levi.js      # executable entry; calls src/cli.js
src/cli.js          # command dispatch and help
src/commands/       # init, update, status, list
src/lib/            # kit loading, install planning, per-tool rendering, hashing
agents/             # team agents and the shared team protocol
usecases/<id>/      # one folder per usecase
docs/               # this documentation; not published to npm
```

Where the logic lives:

| File | Responsibility |
|---|---|
| `src/lib/usecases.js` | Loads and validates usecases and the whole kit |
| `src/lib/agents.js` | Reads team agents, validates agent frontmatter |
| `src/lib/tools.js` | Per-tool paths, manual-only policy, agent rendering |
| `src/lib/desired-state.js` | Builds the set of files a clean install would contain |
| `src/lib/sync.js` | Compares that set with disk and `.levi.json`, then applies it |
| `src/lib/router.js` | Generates the `levi` entry point skill |
| `src/lib/config.js` | Reads and writes `.levi.json` |
| `src/lib/report.js` | Prints the install and update report |

## Making a change

1. Branch from `master`.
2. Change the code, usecase or agent files.
3. Try it in a scratch project: `node /path/to/levi-gear/bin/levi.js init`, then `status`, change a generated file, and `update`.
4. Update the docs in `docs/` when behavior, commands or file layout change.
5. Open a pull request.

## Docs

The docs are plain Markdown in `docs/`, read on GitHub. Link between pages with relative links. When you change a command, update [CLI reference](cli.md) and the page that explains the behavior.
