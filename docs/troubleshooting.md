# Troubleshooting

## `/davinci` is not recognized

- Check that the files exist: `.claude/skills/davinci/SKILL.md` (Claude Code), `.agents/skills/davinci/SKILL.md` (Codex, and Copilot without Claude). If not, run `npx davinci@latest init`.
- Make sure you ran `init` in the project root, not a subfolder.
- Restart the tool or open a new session: tools often load skills at start.
- Codex uses `$davinci`, not `/davinci`.
- If you installed with `--tools` that left your tool out, add it: `npx davinci@latest init --tools claude,codex`.

## The entry point picks the wrong usecase

It matches your request to usecase descriptions and runs the best match, naming a close runner-up. Call the one you want directly: `/davinci-<usecase> <request>`. If the match is wrong because the request is vague, say what you want the output to be.

## The entry point says no usecase fits

Nothing installed matches the request. Run `npx davinci@latest list` to see what the kit offers, and `init <usecase>` to add one.

## `update` keeps a file I did not edit

A file counts as changed when its content differs from the hash in `.davinci.json`. Common causes:

- **An editor or formatter changed it**, for example trailing whitespace or a reformat on save. Compare it with the kit version using `update --force` on a copy, or accept the file as customized.
- **An old config without hashes.** Early versions recorded paths only. Every file that differs from the kit counts as changed. Run `npx davinci@latest update --force` once to record hashes. Back up files you did edit first.
- **Line endings.** CRLF versus LF does not count as an edit, so this is not the cause.

`davinci status` names each kept file.

## A file reports as "not managed by davinci"

The path existed before davinci wrote it, so davinci will not overwrite it. Rename or move your file and run `update`, or take the kit version with `update --force <path>` if yours is disposable.

## A file I deleted is not coming back

By design. `update` does not recreate files you deleted. Use `update --force <path>` to restore one.

## `update` did not add a new usecase

`update` only refreshes usecases you already installed. Add the new one with `npx davinci@latest init <usecase>`.

## `No .davinci.json found. Run "davinci init" first.`

You ran `update` or `status` in a folder that has no install, or that you installed without committing `.davinci.json`. Run the command from the project root, or run `init`.

## `.davinci.json` conflicts when merging branches

Two branches changed the install (different versions or usecases). Resolve the conflict, then run `npx davinci@latest status` to see whether the files and the recorded hashes still agree. If they do not, run `update`: files you changed are kept, the rest are brought in line. A hash that no longer matches an untouched file simply makes `update` replace it with the kit version.

## A subagent is not used

Team agents are used only when a usecase delegates to them, by design. Their descriptions tell the tool to select them for nothing else. To work with an agent yourself, run a usecase that uses it, or call it by name in your tool.

## Agents asked me nothing, or asked too much

Team agents never ask you directly; they return questions and the usecase's workflow relays them, usually once. If a workflow should ask differently, edit its `SKILL.md`. See [Customization](customization.md).

## Files left behind in `docs/davinci/`

A usecase writes scratch files there during a run and deletes them at the end. An interrupted run can leave them. They are safe to delete.

## Where to look for what changed

- `git diff` shows what `update` changed.
- `.davinci.json` lists every file davinci manages.
- [Configuration and file layout](configuration.md) explains where each tool's files go.
