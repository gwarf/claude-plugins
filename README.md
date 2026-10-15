# claude-plugins

Claude Code mods by Baptiste Grenier. One marketplace, one folder per mod under `plugins/`; add the marketplace once, then install only the mods you want.

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

```sh
claude plugin validate plugins/<mod>
claude plugin test plugins/<mod>
```

MIT, see LICENSE. Third-party notices live beside the mod that carries them.
