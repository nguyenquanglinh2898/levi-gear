# CLI reference

```text
levi <command>
```

Run with `npx levi-gear@latest <command>` from the root of your project. All commands act on the current directory.

| Command | Purpose |
|---|---|
| [`init`](#levi-init) | Install usecases |
| [`update`](#levi-update) | Refresh installed files, keeping your changes |
| [`status`](#levi-status) | Show what `update` would do |
| [`list`](#levi-list) | List usecases in the kit |

Global options:

| Option | Effect |
|---|---|
| `-h`, `--help`, or no command | Print the help text |
| `-v`, `--version` | Print the package version |

An unknown command prints `Unknown command: <name>` followed by the help, and exits with code 1.

## levi init

```text
levi init [usecase...]
```

Installs usecases, the team agents and the `levi` entry point, and writes `.levi.json`.

| Argument | Meaning |
|---|---|
| `usecase...` | Usecases to install. Omit to install every usecase in the kit |

Behavior:

- Merges with an existing install: usecases already installed stay, named ones are added.
- Also installs the usecases a named usecase requires (`requires:` in its `SKILL.md`), for example `create-feature` brings `spec-writing`, `brainstorming` and `design`, and always installs the [role skills](team.md#role-skills) of the team agents.
- Never overwrites a file you changed or a path levi did not write; both are reported.
- Prints a summary, a file report and the invocation syntax.

Exit code 1 when `--tools` is passed (nothing is installed; the option was removed with Codex and Copilot support) or a usecase name is not in the kit (the others are still installed).

More: [Installation](installation.md).

## levi update

```text
levi update [--force [path...]]
```

Refreshes installed files to the package version. Requires `.levi.json`; without it, prints `No .levi.json found. Run "levi init" first.` and exits with code 1.

| Option | Meaning |
|---|---|
| `--force` | Overwrite every file you changed with the kit version |
| `--force <path>...` | Overwrite only the given files. Paths are relative to the project root, as in the report |

Behavior: see the table in [Updating](updating.md#what-update-does-to-each-file). Only the usecases already installed are considered.

## levi status

```text
levi status
```

Dry run of `update`. Prints what `update` would add, update and remove, and the files it would keep. Writes nothing, not even `.levi.json`. Requires `.levi.json`, with the same error and exit code as `update`.

## levi list

```text
levi list
```

Prints each usecase of the kit: its id, the usecase's own agents and the usecases it requires (when it has any) and its description. Then prints the invocation syntax.

```text
brainstorming
  Brainstorm any problem or idea with the PM and Teamlead and turn it into an execution plan ...

Invoke with:
  /levi <request>    /levi-<usecase> <request>
```

`list` shows what the kit offers, not what is installed. Installed usecases are the keys of `usecases` in `.levi.json`.

## Exit codes

| Code | When |
|---|---|
| 0 | Success |
| 1 | Unknown command, `--tools` passed, usecase not in the kit, `update` or `status` without `.levi.json`, or an error while reading the kit or config |

Errors while loading the kit, such as a malformed agent file, are printed as a message and exit with code 1 before any file is written.
