#!/usr/bin/env bash
# Audit monorepo SDD coordination coverage and consistency.

set -e

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
ROOT_SDD="$REPO_ROOT/.sdd"
ALT_ROOT_SDD="$REPO_ROOT/.SDD"
COORD_DIR="$ROOT_SDD/coordination"
PROGRESS_DIR="$COORD_DIR/progress"
LATEST_REPORT="$PROGRESS_DIR/sdd-compliance-latest.md"
HISTORY_REPORT="$PROGRESS_DIR/sdd-compliance-history.md"
WRITE_REPORT=false

for arg in "$@"; do
  case "$arg" in
    --write-report)
      WRITE_REPORT=true
      ;;
    --help|-h)
      echo "Usage: $0 [--write-report]"
      echo "  --write-report   Update rolling compliance report files"
      exit 0
      ;;
  esac
done

critical_count=0
warning_count=0
info_count=0

PASSES=()
CRITICALS=()
WARNINGS=()
INFOS=()
FILES_CHECKED=()

say() {
  printf "%s\n" "$1"
}

add_pass() {
  PASSES+=("$1")
}

add_critical() {
  CRITICALS+=("$1")
  critical_count=$((critical_count + 1))
}

add_warning() {
  WARNINGS+=("$1")
  warning_count=$((warning_count + 1))
}

add_info() {
  INFOS+=("$1")
  info_count=$((info_count + 1))
}

check_file_exists() {
  local file="$1"
  FILES_CHECKED+=("$file")
  if [[ ! -f "$file" ]]; then
    add_critical "Missing required file: ${file#$REPO_ROOT/}"
    return 1
  fi
  return 0
}

check_root_integrity() {
  local ok=true

  check_file_exists "$ROOT_SDD/constitution.md" || ok=false
  check_file_exists "$ROOT_SDD/memory/current-state/progress.md" || ok=false
  check_file_exists "$COORD_DIR/progress/current-phase-status.md" || ok=false
  check_file_exists "$COORD_DIR/progress/weekly-updates.md" || ok=false
  check_file_exists "$ROOT_SDD/templates/requirements-template.md" || ok=false
  check_file_exists "$ROOT_SDD/templates/design-template.md" || ok=false
  check_file_exists "$ROOT_SDD/templates/tasks-template.md" || ok=false

  if [[ "$ok" == true ]]; then
    add_pass "Root .sdd governance files present and readable."
  fi
}

check_local_sdd_coverage() {
  local found=false

  for bucket in apps services; do
    if [[ ! -d "$REPO_ROOT/$bucket" ]]; then
      continue
    fi

    while IFS= read -r local_sdd; do
      found=true
      local component_dir
      component_dir=$(dirname "$local_sdd")
      local component_name
      component_name=$(basename "$component_dir")

      FILES_CHECKED+=("$local_sdd")

      if [[ ! -d "$local_sdd/specs/active" ]]; then
        add_warning "${bucket}/${component_name}: missing .sdd/specs/active"
      fi
      if [[ ! -d "$local_sdd/templates" ]]; then
        add_warning "${bucket}/${component_name}: missing .sdd/templates"
      fi
      if [[ ! -d "$local_sdd/memory/current-state" ]]; then
        add_warning "${bucket}/${component_name}: missing .sdd/memory/current-state"
      fi

      local card_path="$COORD_DIR/$bucket/$component_name/$component_name-coordination.md"
      FILES_CHECKED+=("$card_path")
      if [[ ! -f "$card_path" ]]; then
        add_warning "Missing coordination card: .sdd/coordination/$bucket/$component_name/$component_name-coordination.md"
      fi
    done < <(find "$REPO_ROOT/$bucket" -mindepth 2 -maxdepth 2 -type d \( -name .sdd -o -name .SDD \) 2>/dev/null)
  done

  if [[ "$found" == false ]]; then
    add_info "No local .sdd component workspaces found under apps/ or services/."
  else
    add_pass "Local .sdd coverage and coordination card checks completed."
  fi
}

check_status_references() {
  local status_file="$COORD_DIR/progress/current-phase-status.md"
  if [[ ! -f "$status_file" ]]; then
    return
  fi

  FILES_CHECKED+=("$status_file")

  local missing_start_sections
  missing_start_sections=$(awk '
    /^### / { if (section != "" && in_progress == 1 && has_start == 0) print section; section=$0; in_progress=0; has_start=0; next }
    /\*\*Status:\*\* In Progress/ { in_progress=1 }
    /\*\*Start Record:\*\*/ { has_start=1 }
    END { if (section != "" && in_progress == 1 && has_start == 0) print section }
  ' "$status_file")

  if [[ -n "$missing_start_sections" ]]; then
    while IFS= read -r section; do
      [[ -z "$section" ]] && continue
      add_warning "In-progress section missing Start Record in current-phase-status.md: $section"
    done <<< "$missing_start_sections"
  fi

  local detail_paths
  detail_paths=$(grep -E "\*\*Details:\*\*" "$status_file" | sed -E 's/.*`([^`]+)`.*/\1/' || true)
  if [[ -n "$detail_paths" ]]; then
    while IFS= read -r path; do
      [[ -z "$path" ]] && continue
      if [[ "$path" == *"["* || "$path" == *"]"* ]]; then
        continue
      fi
      FILES_CHECKED+=("$REPO_ROOT/$path")
      if [[ ! -e "$REPO_ROOT/$path" ]]; then
        add_warning "Details path does not exist: $path"
      fi
    done <<< "$detail_paths"
  fi

  local start_paths
  start_paths=$(grep -E "\*\*Start Record:\*\*" "$status_file" | sed -E 's/.*`([^`]+)`.*/\1/' || true)
  if [[ -n "$start_paths" ]]; then
    while IFS= read -r path; do
      [[ -z "$path" ]] && continue
      if [[ "$path" == *"["* || "$path" == *"]"* ]]; then
        continue
      fi
      FILES_CHECKED+=("$REPO_ROOT/$path")
      if [[ ! -f "$REPO_ROOT/$path" ]]; then
        add_warning "Start record path does not exist: $path"
      fi
    done <<< "$start_paths"
  fi

  add_pass "current-phase-status.md references were validated."
}

check_reference_hygiene() {
  local legacy_refs
  legacy_refs=$(find "$REPO_ROOT" -type f \
    -not -path "$REPO_ROOT/.git/*" \
    -not -path "$REPO_ROOT/node_modules/*" \
    -not -path "$REPO_ROOT/.sdd/workflows/*" \
    -not -path "$REPO_ROOT/.SDD/workflows/*" \
    -exec grep -nH "\.kiro" {} + 2>/dev/null || true)

  if [[ -n "$legacy_refs" ]]; then
    add_warning "Legacy '.kiro' references detected outside workflow docs."
  else
    add_info "No legacy '.kiro' references detected outside workflow docs."
  fi
}

write_report_files() {
  local today
  today=$(date +%Y-%m-%d)
  local result="Pass"
  if [[ $critical_count -gt 0 ]]; then
    result="Fail"
  fi

  mkdir -p "$PROGRESS_DIR"

  {
    echo "# SDD Compliance Audit (Latest)"
    echo
    echo "## Summary"
    echo "- Date: $today"
    echo "- Result: $result"
    echo "- Findings: Critical $critical_count | Warning $warning_count | Info $info_count"
    echo
    echo "## Passes"
    if [[ ${#PASSES[@]} -eq 0 ]]; then
      echo "- None."
    else
      for item in "${PASSES[@]}"; do
        echo "- $item"
      done
    fi
    echo
    echo "## Findings"
    echo "### Critical"
    if [[ ${#CRITICALS[@]} -eq 0 ]]; then
      echo "- None."
    else
      for item in "${CRITICALS[@]}"; do
        echo "- $item"
      done
    fi
    echo
    echo "### Warning"
    if [[ ${#WARNINGS[@]} -eq 0 ]]; then
      echo "- None."
    else
      for item in "${WARNINGS[@]}"; do
        echo "- $item"
      done
    fi
    echo
    echo "### Info"
    if [[ ${#INFOS[@]} -eq 0 ]]; then
      echo "- None."
    else
      for item in "${INFOS[@]}"; do
        echo "- $item"
      done
    fi
    echo
    echo "## Suggested Fixes"
    if [[ ${#CRITICALS[@]} -eq 0 && ${#WARNINGS[@]} -eq 0 ]]; then
      echo "- None."
    else
      echo "- Resolve critical items first, then warnings."
    fi
    echo
    echo "## Files Checked"
    if [[ ${#FILES_CHECKED[@]} -eq 0 ]]; then
      echo "- None."
    else
      for item in "${FILES_CHECKED[@]}"; do
        echo "- $item"
      done
    fi
  } > "$LATEST_REPORT"

  if [[ ! -f "$HISTORY_REPORT" ]]; then
    {
      echo "# SDD Compliance Audit History"
      echo
      echo "Append one line per audit run."
      echo
    } > "$HISTORY_REPORT"
  fi

  echo "- $today: Critical $critical_count | Warning $warning_count | Info $info_count" >> "$HISTORY_REPORT"
}

print_summary() {
  say "SDD Monorepo Audit"
  say "Summary: Critical $critical_count | Warning $warning_count | Info $info_count"

  if [[ ${#CRITICALS[@]} -gt 0 ]]; then
    say ""
    say "Critical Findings:"
    for item in "${CRITICALS[@]}"; do
      say "- $item"
    done
  fi

  if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    say ""
    say "Warnings:"
    for item in "${WARNINGS[@]}"; do
      say "- $item"
    done
  fi

  if [[ ${#INFOS[@]} -gt 0 ]]; then
    say ""
    say "Info:"
    for item in "${INFOS[@]}"; do
      say "- $item"
    done
  fi
}

main() {
  if [[ ! -d "$ROOT_SDD" && -d "$ALT_ROOT_SDD" ]]; then
    ROOT_SDD="$ALT_ROOT_SDD"
    COORD_DIR="$ROOT_SDD/coordination"
    PROGRESS_DIR="$COORD_DIR/progress"
    LATEST_REPORT="$PROGRESS_DIR/sdd-compliance-latest.md"
    HISTORY_REPORT="$PROGRESS_DIR/sdd-compliance-history.md"
    add_info "Using legacy root '.SDD' directory."
  fi

  if [[ ! -d "$ROOT_SDD" ]]; then
    add_critical "Root .sdd directory missing."
    print_summary
    exit 1
  fi

  check_root_integrity
  check_local_sdd_coverage
  check_status_references
  check_reference_hygiene

  if [[ "$WRITE_REPORT" == true ]]; then
    write_report_files
    add_pass "Compliance report files updated."
  fi

  print_summary

  if [[ $critical_count -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
