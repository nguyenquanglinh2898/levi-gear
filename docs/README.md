# levi documentation

levi is an agentic kit. It installs ready-made workflows (**usecases**) and a shared **team** of role agents into your project, for Claude Code, Codex and GitHub Copilot, with one command.

## Getting started

1. [Introduction](introduction.md): what levi is and how the pieces fit together
2. [Installation](installation.md): requirements, `levi init`, what lands in your project
3. [Usage](usage.md): how to invoke levi in each tool

## Guides

- [Usecases](usecases.md): the usecases in the kit, with `brainstorming` in detail
- [The team](team.md): the five role agents and the protocol they follow
- [Updating](updating.md): `levi update`, how your edits are protected, `--force`
- [Customization](customization.md): adapt installed files to your project

## Reference

- [CLI reference](cli.md): every command, option and exit code
- [Configuration and file layout](configuration.md): `.levi.json` and where each file is written
- [Authoring usecases](authoring-usecases.md): add a usecase or a team agent to the kit
- [Troubleshooting](troubleshooting.md): common problems and how to solve them
- [Contributing](contributing.md): conventions for changes to levi itself

## Quick start

```bash
npx levi-gear@latest init        # install everything, for all three tools
```

Then, in your tool:

```text
/levi brainstorm how we should add CSV export to orders     # Claude Code, Copilot
$levi brainstorm how we should add CSV export to orders     # Codex
```

Keep it current with `npx levi-gear@latest update`.
