# claude-plugins

Claude Code mods by gwarf: a plugin marketplace. One marketplace, one folder per mod under `plugins/`; add it once, then install only the mods you want.

| Mod | What it does |
|---|---|
| [copy-code-kb](plugins/copy-code-kb/) | Copy a code block of the last reply from the keyboard: `/cc [n]`, or a digit on the band above the prompt. Main-screen TUI, no mouse. |

## Install

At the prompt of a terminal session:

```
/plugin install copy-code-kb --marketplace gwarf/claude-plugins
```

Answer `y` to add the marketplace, then pick a scope. From a shell:

```sh
claude plugin install copy-code-kb --marketplace gwarf/claude-plugins
```

Requires Claude Code 2.1.287 or newer (function hooks API). Each mod's README has the details.

## Develop

One script runs every check, the same locally and in CI:

```sh
ci/check.sh all
```

`validate` is `claude plugin validate --strict` on the marketplace and each plugin, `lint` is Biome (`biome.json`), `types` is `tsc` against the types Claude Code writes beside a mod it has loaded, `test` is `claude plugin test`. CI runs validate, lint and test on every push and pull request; `types` is local only, because Claude Code writes a mod's types when an interactive session loads it. Fix formatting with `bunx @biomejs/biome check --write plugins`.

MIT, see LICENSE. Third-party notices live beside the mod that carries them.
