# Usage

davinci runs only when you ask for it. Everything you type that does not start with the davinci command is handled by your tool as usual.

## Invoking

| Tool | Let davinci pick the usecase | Call a usecase directly |
|---|---|---|
| Claude Code | `/davinci <request>` | `/davinci-<usecase> <request>` |
| Copilot | `/davinci <request>` | `/davinci-<usecase> <request>` |
| Codex | `$davinci <request>` | `$davinci-<usecase> <request>` |

Codex has no user-defined `/` commands in a repository, so it uses `$` instead. `davinci init`, `update` and `list` print the right syntax for the tools you installed.

## The entry point: `davinci <request>`

The entry point is a skill generated at install time from the usecases you installed. It follows these steps:

1. **Empty request:** lists the installed usecases, one line each, and asks what you want.
2. **No usecase fits:** says so, lists the usecases, and stops. It does not improvise a substitute.
3. **One or more fit:** runs the best match. When several fit about equally, it takes the one whose description names your main goal most specifically. It does not ask you to choose.
4. It tells you which usecase it chose in one line. When another was a close match, it names it and says that `/davinci-<usecase>` runs it directly.

The request can be written in any language. The match is by meaning against each usecase's description, and the answer comes back in the language you used.

Because the entry point is generated from what is installed, installing or removing a usecase changes what it can pick. After `davinci init <usecase>` or `davinci update`, the entry point is regenerated.

## Calling a usecase directly

When you know which usecase you want, skip the matching:

```text
/davinci-brainstorming how should we migrate the billing tables to the new schema
```

This is also the way to run the runner-up when the entry point picked a different usecase.

## Examples

```text
# let davinci choose
/davinci we need to let users export orders as CSV, what is the plan?

# direct call in Claude Code or Copilot
/davinci-brainstorming split the checkout refactor into tasks and estimate it

# direct call in Codex
$davinci-brainstorming split the checkout refactor into tasks and estimate it
```

## What happens during a run

A usecase is a workflow. While it runs:

- The usecase's skill calls team agents one at a time (`davinci-pm`, `davinci-teamlead`, ...). Team agents never run on their own and never call each other.
- Agents cannot ask you questions directly. They return their open questions, and the workflow relays them to you, usually once, as a batch. Questions come with options and a recommended answer. An unanswered question takes the recommended option and is recorded as an assumption.
- Agents hand work to each other through files in a work folder, by default `docs/davinci/<slug>/`. Some usecases delete these scratch files at the end and leave only the deliverable.
- Every agent ends its reply with a status report (`DONE`, `DONE_WITH_CONCERNS`, `BLOCKED` or `NEEDS_CONTEXT`). See [The team](team.md#reply-format).

## Listing what is available

```bash
npx davinci@latest list
```

Prints each usecase of the kit with its description and the agents it owns, then the invocation syntax. See [CLI reference](cli.md#davinci-list).
