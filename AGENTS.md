# Working in this repository

This is a Claude Code plugin marketplace: `.claude-plugin/marketplace.json` at the root lists the mods, one folder per mod under `plugins/`. A mod is a hooks module (`hooks/register.tsx`) plus its manifest (`.claude-plugin/plugin.json`), its tests (`hooks/*.test.tsx`), its `$.state` contract (`types/index.d.ts`), a README and, where code was adapted, a THIRD_PARTY.md.

## Checks

Run `ci/check.sh all` before pushing. It runs the same four checks as CI:

- `validate`: `claude plugin validate --strict` on the marketplace root and on each plugin.
- `lint`: Biome, config in `biome.json`. Fix formatting with `bunx @biomejs/biome check --write plugins`.
- `types`: `tsc -p plugins/<mod>`. The types come from `.claude-plugin/types/`, which Claude Code writes beside a mod when an interactive session loads it; the script copies them from the plugin-authoring skill bundle when they are missing. CI skips this check for that reason.
- `test`: `claude plugin test plugins/<mod>`, offline, no credentials.

Every mod ships tests for the behaviour it adds. A change to a mod's behaviour changes or adds a test in the same commit.

## Conventions

- A mod's `name` in `plugin.json` is permanent: renaming breaks every install. The entry name in `marketplace.json` matches it.
- Bump `version` in `plugin.json` on every release; Claude Code only updates an installed plugin when the version changes.
- Keep `description`, `author`, `homepage` and `repository` filled in `plugin.json`, and a README at the mod root with the install line.
- Code adapted from elsewhere is named in the mod's THIRD_PARTY.md with its licence text, and the mod README points to the origin.
- Comments carry the non-obvious why only: a safety property, a rejected alternative, a footgun. Provenance goes in the commit message.
- Actions in `.github/workflows` are pinned to a commit SHA with the tag in a trailing comment; Dependabot bumps them.
- Nothing in CI needs a secret, token or API key. Keep it that way.
- Generated `.claude-plugin/types/` folders are ignored by git and never committed.

## Changes

Branch from `main`, open a pull request, let CI pass, then squash-merge. The PR title and body become the commit on `main`, so write the body as a commit message: what changed and why this shape rather than the alternative. Required checks on `main`: Validate manifests, Lint and format, Mod tests.

## Adding a mod

1. Create `plugins/<name>/` with `.claude-plugin/plugin.json`, `hooks/hooks.json` naming the module, the module, tests and a README.
2. Add its entry to `.claude-plugin/marketplace.json` with `source: ./plugins/<name>`.
3. Add a row to the table in the root README.
4. Run `ci/check.sh all`.
