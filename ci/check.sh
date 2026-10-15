#!/usr/bin/env bash
# One entry point for every check, the same locally and in CI:
#   ci/check.sh validate | lint | types | test | all
set -euo pipefail

cd "$(dirname "$0")/.."

BIOME_VERSION=2.5.15
TSC_VERSION=5.9.3
export DISABLE_AUTOUPDATER=1

plugin_dirs() {
  find plugins -mindepth 1 -maxdepth 1 -type d | sort
}

check_validate() {
  local rc=0 dir
  claude plugin validate --strict . || rc=1
  for dir in $(plugin_dirs); do
    claude plugin validate --strict "$dir" || rc=1
  done
  return "$rc"
}

check_lint() {
  bunx "@biomejs/biome@$BIOME_VERSION" ci --colors=off plugins
}

# Claude Code writes a mod's types only when an interactive session loads it, so a
# fresh clone has none; fall back to the plugin-authoring skill's copy on this machine.
types_for() {
  local dir=$1 bundle
  if [ -f "$dir/.claude-plugin/types/tsconfig.json" ]; then
    return 0
  fi
  bundle=$(ls -d /tmp/claude-*/bundled-skills/*/*/plugin-authoring/types/claude-code.d.ts 2>/dev/null | tail -1 || true)
  if [ -z "$bundle" ]; then
    echo "$dir: no .claude-plugin/types and no plugin-authoring bundle here; load the mod in a Claude Code session first."
    return 1
  fi
  mkdir -p "$dir/.claude-plugin/types/claude-code"
  cp "$bundle" "$dir/.claude-plugin/types/claude-code/index.d.ts"
  cat >"$dir/.claude-plugin/types/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "target": "es2023", "lib": ["es2023"], "types": [],
    "module": "esnext", "moduleResolution": "bundler",
    "strict": true, "noUncheckedIndexedAccess": true,
    "noEmit": true, "skipLibCheck": true,
    "jsx": "react", "jsxFactory": "h", "jsxFragmentFactory": "Fragment"
  },
  "include": ["./claude-code/index.d.ts"]
}
JSON
}

check_types() {
  local rc=0 dir
  for dir in $(plugin_dirs); do
    { types_for "$dir" && bunx "typescript@$TSC_VERSION" -p "$dir"; } || rc=1
  done
  return "$rc"
}

check_test() {
  local rc=0 dir
  for dir in $(plugin_dirs); do
    claude plugin test "$dir" || rc=1
  done
  return "$rc"
}

case "${1:-all}" in
  validate) check_validate ;;
  lint) check_lint ;;
  types) check_types ;;
  test) check_test ;;
  all)
    rc=0
    for c in validate lint types test; do
      echo "== $c"
      "check_$c" || rc=1
    done
    exit "$rc"
    ;;
  *)
    echo "usage: ci/check.sh validate|lint|types|test|all" >&2
    exit 2
    ;;
esac
