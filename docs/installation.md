# Installation

## Requirements

- Node.js 18 or newer
- A project folder where you use Claude Code

levi is not installed globally. You run it with `npx` from the root of your project.

## Install

```bash
npx levi-gear@latest init
```

This installs every usecase in the kit. Run it from the project root: levi writes into the current directory.

### Choose usecases

Name the usecases to install; leave them out to install all.

```bash
npx levi-gear@latest init brainstorming
```

See which usecases exist with `npx levi-gear@latest list`.

## What `init` does

1. Reads the kit and validates it, so a broken file fails before anything is written.
2. Writes:
   - a skill folder per usecase (`levi-<usecase>/`);
   - the generated entry point `levi/`;
   - subagent files for the usecase's own agents and for the five team agents.
3. Marks every skill as manual-only.
4. Writes `.levi.json` with the installed usecases and a hash of every file written.
5. Prints a summary and the invocation syntax.

Example output:

```text
Installed 1 usecase(s) for Claude Code
  - brainstorming
Added 21, updated 0, removed 0 file(s).

Invoke with:
  /levi <request>    /levi-<usecase> <request>
```

The exact file count depends on the kit version. For the full list of paths, see [Configuration and file layout](configuration.md).

## Commit the result

Commit the generated folders and `.levi.json`. Teammates then get everything by cloning, and `.levi.json` lets anyone run `levi update` later without overwriting local edits.

```bash
git add .claude .levi.json
git commit -m "chore: install levi"
```

## Running `init` again

`init` is safe to repeat. It merges with what is installed:

- **Add a usecase:** `levi init <usecase>` keeps the usecases you already have and adds the new one.
- **Files you changed** are never overwritten by `init`. They are reported as kept. Use [`update --force`](updating.md#taking-the-kit-version-of-a-file) to take the kit version.
- **A path that already exists** and was not written by levi is kept as is and reported as a conflict.

## Errors

| Message | Cause |
|---|---|
| `levi supports Claude Code only; the --tools option no longer exists.` | `--tools` was passed. Earlier versions accepted it for Codex and Copilot. Nothing is installed. |
| `Not found in kit: x` | A usecase name does not exist. The other usecases named are still installed; the command exits with code 1. |

## Uninstall

There is no uninstall command. To remove levi, delete the files it wrote: the `levi*` entries under `.claude/skills/` and `.claude/agents/`, and `.levi.json`. [Configuration and file layout](configuration.md) lists them, and `.levi.json` records every path.
