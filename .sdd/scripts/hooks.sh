#!/usr/bin/env bash
# Explicitly enable recorded SDD gates while preserving an existing hook.
set -e
ROOT=$(git rev-parse --show-toplevel) || exit 1
cd "$ROOT"
HOOK=$(git rev-parse --git-path hooks/pre-commit)
case "${1:-status}" in
  status)
    printf 'Effective pre-commit path: %s\n' "$HOOK"
    if [[ -f "$HOOK" ]]; then head -3 "$HOOK"; else echo 'No pre-commit hook installed'; fi
    ;;
  install)
    if [[ -f "$HOOK" ]] && grep -q '^# SDD recorded hook wrapper$' "$HOOK"; then echo 'Recorded SDD hook already installed'; exit 0; fi
    ORIGINAL=""
    if [[ -e "$HOOK" || -L "$HOOK" ]]; then
      [[ ! -e "$HOOK.sdd-original" ]] || { echo 'Backup already exists; refusing to overwrite it' >&2; exit 1; }
      mv "$HOOK" "$HOOK.sdd-original"
      ORIGINAL=$(cd "$(dirname "$HOOK")" && pwd)/$(basename "$HOOK").sdd-original
    fi
    mkdir -p "$(dirname "$HOOK")"
    {
      printf '#!/usr/bin/env bash\n# SDD recorded hook wrapper\n'
      printf 'ORIGINAL=%q\n' "$ORIGINAL"
      cat <<'WRAPPER'
ROOT=$(git rev-parse --show-toplevel) || exit 1
cd "$ROOT" || exit 1
for scripts in .sdd/scripts scripts .sdd-framework/scripts; do
  if [[ -f "$scripts/hook-run.sh" ]]; then
    if [[ -n "$ORIGINAL" ]]; then exec bash "$scripts/hook-run.sh" --existing-hook "$ORIGINAL"; fi
    exec bash "$scripts/hook-run.sh"
  fi
done
echo 'SDD hook runner missing; restore framework scripts.' >&2
exit 1
WRAPPER
    } > "$HOOK"
    chmod +x "$HOOK"
    echo 'Recorded SDD gates installed; previous hook is preserved and chained.'
    ;;
  *) echo 'Usage: hooks.sh status | install' >&2; exit 1 ;;
esac
