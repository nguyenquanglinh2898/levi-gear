# Updating

```bash
npx levi-gear@latest update
```

`update` refreshes the installed files to the version of the package you run. It never overwrites or deletes a file you changed.

## How your edits are protected

Installed files are yours: you can edit them to fit your project. When levi writes a file at install time, it records a SHA-256 hash of the content in `.levi.json`. On `update`, it compares each file on disk with that recorded hash:

- Same hash: you have not touched it, so it is safe to replace.
- Different hash: you changed it, so it is left alone.

Line endings do not count as an edit. Text is hashed with CRLF folded to LF, so Git's `core.autocrlf` rewriting a file does not make it look customized.

## What `update` does to each file

| State of the file | What `update` does |
|---|---|
| Untouched | Replaces it with the new version, or deletes it if the kit dropped it |
| You changed it | Keeps your file and ignores the kit's version |
| You deleted it | Does not recreate it |
| New in the kit | Adds it |
| Path already exists and was not written by levi | Keeps your file and ignores the kit's version |

levi does not merge. A file you changed is yours from then on and stops receiving kit updates until you run `--force` on it.

## Preview first: `levi status`

```bash
npx levi-gear@latest status
```

Runs the same comparison as `update` but writes nothing. It prints what `update` would add, update and remove, and lists the files it would keep. Use it before updating to see which of your files will not get the new version.

```text
Would add 2, update 6, remove 0 file(s).

Changed by you (kept as is):
  .claude/agents/levi-qa.md

To take the kit version of a file instead: levi update --force [path...]
```

Note that `status` compares against the package version you run it with: `npx levi-gear@latest status` shows what updating to the latest version would do.

## After an update

```text
Updated 0.1.0 -> 0.2.0 (1 usecase(s))
Added 2, updated 6, removed 0 file(s).
```

`update` also regenerates the `levi` entry point from the installed usecases, rewrites `.levi.json` with the new version and hashes, and prints the invocation syntax. Commit the changed files and `.levi.json`.

### The report

| Section | Meaning |
|---|---|
| `Changed by you (kept as is)` | You edited the file; the kit's new version was ignored |
| `Already exist and are not managed by levi (kept as is)` | The path exists but levi did not write it, so it will not overwrite it |
| `Deleted by you (not recreated)` | You removed a file levi installed; it stays removed |
| `No longer in the kit, kept because you changed them` | The kit dropped the file, but you had edited it, so it was not deleted. It is also no longer tracked |

## Taking the kit version of a file

To discard your changes to a file and take the kit version, use `--force`.

```bash
# one or more files, by project-relative path as shown in the report
npx levi-gear@latest update --force .claude/agents/levi-qa.md

# every file you changed
npx levi-gear@latest update --force
```

`--force` also applies to the other kept cases: a path that existed before levi, and a file you deleted (it is recreated).

Before forcing a file you customized, copy your version somewhere so you can reapply your edits to the new one.

## New usecases in the kit

`update` refreshes only the usecases you already installed. It does not add usecases that are new in the kit. To get one, name it:

```bash
npx levi-gear@latest list                 # see what the kit offers
npx levi-gear@latest init <usecase>       # add it; your other usecases stay
```

Team agents and the entry point are always updated.

## Usecases removed from the kit

If an installed usecase no longer exists in the new version, `update` removes its files that you did not change, keeps the ones you edited, and prints `<id> is no longer in the kit; its unchanged files were removed.`

## Changing tools

`update` keeps the tools you chose at install time. To add or drop a tool, run `levi init --tools ...`. See [Installation](installation.md#running-init-again).

## Typical flow

```bash
npx levi-gear@latest status                 # what would change?
npx levi-gear@latest update                 # apply, keeping your edits
git diff                                  # review
git add -A && git commit -m "chore: update levi"
```
