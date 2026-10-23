#!/usr/bin/env bash
# Scan for spec files placed outside .sdd/

set -e

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
TARGET_DIR="$REPO_ROOT/.sdd"
QUAR_DIR="$TARGET_DIR/specs/backlog/_quarantine"

FIX=false

for arg in "$@"; do
  case "$arg" in
    --fix)
      FIX=true
      ;;
    --help|-h)
      echo "Usage: $0 [--fix]"
      echo "  --fix   Move stray spec files into .sdd/specs/backlog/_quarantine"
      exit 0
      ;;
  esac
done

NAMES=(
  "requirements.md"
  "design.md"
  "tasks.md"
  "spec.md"
  "feature-spec.md"
  "implementation_plan.md"
  "plan.md"
)

PRUNE_DIRS=(
  ".git"
  ".sdd"
  ".sdd-framework"
  "node_modules"
  "dist"
  "build"
  "out"
  "defaults"
  ".next"
  ".cache"
  ".turbo"
  ".vercel"
  ".vscode"
)

say() {
  printf "%s\n" "$1"
}

if [[ ! -d "$TARGET_DIR" ]]; then
  say "WARN .sdd not found; scan still running"
fi

say "Stray Spec Scan"

FOUND=0

find_cmd=(find "$REPO_ROOT" "(")
for dir in "${PRUNE_DIRS[@]}"; do
  find_cmd+=(-name "$dir" -o)
done
find_cmd+=(-false ")")
find_cmd+=(-prune -o -type f "(")
for name in "${NAMES[@]}"; do
  find_cmd+=(-name "$name" -o)
done
find_cmd+=(-false ")" -print)

while read -r file; do
  case "$file" in
    "$REPO_ROOT"/.sdd/*)
      continue
      ;;
  esac
  FOUND=$((FOUND+1))
  if [[ "$file" == *"/docs/"* ]]; then
    say "WARN docs contains spec file: ${file#$REPO_ROOT/}"
  else
    say "WARN spec file outside .sdd: ${file#$REPO_ROOT/}"
  fi
  if [[ "$FIX" == true ]]; then
    if [[ -d "$TARGET_DIR" ]]; then
      mkdir -p "$QUAR_DIR"
      base="$(basename "$file")"
      dest="$QUAR_DIR/$base"
      if [[ -e "$dest" ]]; then
        dest="$QUAR_DIR/$(date +%Y%m%d-%H%M%S)-$base"
      fi
      mv "$file" "$dest"
      say "     MOVED -> ${dest#$REPO_ROOT/}"
    else
      say "     SKIP  .sdd not found"
    fi
  else
    say "     Suggest: move to .sdd/specs/active/<feature>/"
  fi
done < <("${find_cmd[@]}")

if [[ $FOUND -eq 0 ]]; then
  say "OK   No stray spec files found"
else
  say "WARN Found $FOUND stray spec file(s)"
  exit 1
fi
