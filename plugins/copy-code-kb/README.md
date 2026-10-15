# copy-code-kb

Copy a fenced code block of Claude's last reply from the keyboard, on the main-screen TUI of Claude Code. No mouse, no fullscreen layout.

- `/cc` copies the last block of the last reply; `/cc 2` the second. The answer names what was copied: `Copied block 2/3 (bash, 5 lines).`
- After a reply with code, a band above the prompt lists its blocks as `1: bash 5L  2: python 12L …`. With the prompt empty, typing the digit copies that block; the digit flashes in the prompt and is taken back, which is the engine handing it to the band. The band hides while a turn runs, under a survey, and once you send the next prompt.
- More than nine blocks: the band shows nine and `+N more: /cc n`.

The block body is copied without its fences. Claude Code's own copy runs first (clipboard tool, OSC 52, tmux buffer); on Wayland, and not over SSH, the mod then re-copies through `wl-copy --type text/plain` so a one-letter block is not typed as binary data.

Nothing is sent to the model and nothing is added to the system prompt. State lives in the session only.

## Install

At the prompt of a terminal session:

```
/plugin install copy-code-kb --marketplace gwarf/claude-plugins
```

Answer `y` to add the marketplace, then pick a scope. From a shell:

```sh
claude plugin install copy-code-kb --marketplace gwarf/claude-plugins
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `gwarf/claude-plugins`, then Add plugin. The mod draws only in a terminal; in the desktop app it does nothing.

Requires Claude Code 2.1.287 or newer (function hooks API).

## Develop

```sh
claude plugin validate .
claude plugin test .
```

`hooks/split.ts` adapts the fence splitting of AH-Merii's copy-code mod (MIT, see THIRD_PARTY.md).
