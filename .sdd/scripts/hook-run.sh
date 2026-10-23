#!/usr/bin/env bash
# Record observed gate executions without requiring the optional visual runtime.
set -u
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 1
cd "$ROOT" || exit 1
LOG_DIR="$ROOT/.sdd/evidence/hooks"
mkdir -p "$LOG_DIR" || exit 1
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
ACTOR=$(git var GIT_AUTHOR_IDENT 2>/dev/null | tr '\t\n' '  ' || printf unknown)
ENVIRONMENT=$(uname -s 2>/dev/null || printf unknown)
TREE=$(git write-tree 2>/dev/null || printf unknown)
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
run_gate() {
  local name="$1" script="$2" code=0 status=PASS native=false
  shift 2
  if [[ "${1:-}" == "--native" ]]; then native=true; shift; fi
  if [[ ! -f "$script" ]]; then
    code=127; status=SKIPPED
  else
    if [[ "$native" == true ]]; then "$script" "$@" || code=$?; else bash "$script" "$@" || code=$?; fi
    [[ "$code" -eq 0 ]] || status=FAIL
  fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$RUN_ID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TREE" "$name" "$code" "$status" "$ACTOR" "$ENVIRONMENT" >> "$LOG_DIR/runs.tsv" || return 1
  [[ "$code" -eq 0 ]]
}
if [[ "${1:-}" == "--existing-hook" ]]; then
  run_gate existing-hook "$2" --native || exit 1
fi
run_gate doctor "$SCRIPT_DIR/doctor.sh" || exit 1
run_gate skills "$SCRIPT_DIR/skills.sh" validate || exit 1
