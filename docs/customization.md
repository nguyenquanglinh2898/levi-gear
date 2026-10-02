# Customization

Installed files are ordinary files in your repository. Edit them to fit the project.

## Editing installed files

Open the file and change it. Examples:

- `.claude/agents/davinci-qa.md`: add your project's test conventions, the E2E runner, naming rules for test cases.
- `.claude/agents/davinci-developer.md`: state your stack, lint and build commands, folder conventions.
- `.claude/skills/davinci-brainstorming/SKILL.md`: change where plans are written or how estimates are formatted.

`davinci update` keeps files you changed and tells you which ones it kept. See [Updating](updating.md).

### Do it for every tool you use

Each tool has its own copy of a file. If you installed for Claude Code and Codex, the same agent exists as `.claude/agents/davinci-qa.md` and `.codex/agents/davinci-qa.toml`. Edit the copy of each tool you use. Codex's file is TOML: put your text inside `developer_instructions`.

### What you give up

davinci does not merge. A file you changed stops receiving kit updates until you run `davinci update --force <path>`. If the kit improves that file later, you will not get the improvement automatically. Run `davinci status` after upgrading: it lists the files kept because of your edits, so you can compare them with the kit's version.

To see what changed in the kit version of a file you customized:

1. Copy your file aside.
2. `davinci update --force <path>`.
3. Diff the two and reapply your edits.

## Keeping a file out of davinci's control

To make a file entirely yours, copy it to a name without the `davinci-` prefix and use that copy.

```bash
cp .claude/agents/davinci-qa.md .claude/agents/our-qa.md
```

Then change the `name:` in the copy to match. A copy is not managed by davinci:

- it is not manual-only unless you set that yourself;
- the `/davinci` entry point does not list or pick it;
- `update` never touches it.

## Per-project usecase behavior

You usually do not need to fork a usecase. The workflows read the project they run in: an existing spec in `docs/specs/`, existing conventions, the language of your request. Put the project's rules where the agents will read them (your tool's project instructions file, or the agent files above) before editing workflows.

## Adding your own usecase

A new usecase belongs in the kit, not in your project, so that it is installed and updated like the others. See [Authoring usecases](authoring-usecases.md).
