#!/usr/bin/env bash
# SDD machine-readable sprint state.
#
# Design decision D1 (see phase-003 design.md): flat key=value, not JSON.
# JSON in bash needs jq or node; requiring either for core workflow contradicts
# this project's bash-only portability, and Bash 3.2 (default macOS) has no good
# JSON story. The state that needs machine reading is flat.
#
# Design decision D2: task completion state is NOT stored here. It lives only in
# tasks.md. Duplicating it would recreate the dual-source-of-truth defect this
# layer exists to remove.
#
# Keys:
#   schema_version          integer, for future migrations
#   active_phase            spec FOLDER name (never a prose title)
#   branch                  git branch for the sprint
#   requirements_approved   ISO date, or empty
#   design_approved         ISO date, or empty
#   tasks_approved          ISO date, or empty
#   started                 ISO timestamp

SDD_STATE_SCHEMA_VERSION=1

# Resolve the state file path. Callers may pre-set SDD_STATE_FILE (tests do).
_state_file() {
    if [[ -n "${SDD_STATE_FILE:-}" ]]; then
        printf '%s' "$SDD_STATE_FILE"
        return
    fi
    local root
    root=$(git rev-parse --show-toplevel 2>/dev/null || printf '.')
    printf '%s' "$root/.sdd/state"
}

# state_get <key>
# Prints the value, or empty if unset/missing. Exit 0 always: an absent key is
# a normal condition, not an error.
state_get() {
    local key="$1"
    local file
    file=$(_state_file)
    [[ -f "$file" ]] || return 0
    # Last assignment wins, so a repaired file with a duplicate key behaves
    # predictably rather than depending on read order.
    grep -E "^${key}=" "$file" 2>/dev/null | tail -n1 | cut -d= -f2-
}

# state_set <key> <value>
# Atomic: writes a temp file then moves it into place, so an interrupted write
# cannot leave truncated state. Fails loudly on any write error (REQ-003.3.4) --
# silently reporting success after a failed write is the exact class of bug this
# module exists to eliminate.
state_set() {
    local key="$1" value="$2"
    local file tmp dir
    file=$(_state_file)
    dir=$(dirname "$file")

    if ! mkdir -p "$dir" 2>/dev/null; then
        printf '❌ Error: cannot create state directory: %s\n' "$dir" >&2
        return 1
    fi

    tmp="${file}.tmp.$$"

    if [[ -f "$file" ]]; then
        if ! grep -vE "^${key}=" "$file" > "$tmp" 2>/dev/null; then
            # grep -v exits 1 when it filters everything out; that is fine.
            # A genuine failure leaves no temp file.
            if [[ ! -f "$tmp" ]]; then
                printf '❌ Error: cannot stage state write: %s\n' "$tmp" >&2
                return 1
            fi
        fi
    else
        : > "$tmp" || {
            printf '❌ Error: cannot create state file: %s\n' "$tmp" >&2
            return 1
        }
    fi

    if ! printf '%s=%s\n' "$key" "$value" >> "$tmp"; then
        printf '❌ Error: cannot append to state: %s\n' "$tmp" >&2
        rm -f "$tmp"
        return 1
    fi

    if ! mv "$tmp" "$file"; then
        printf '❌ Error: cannot commit state write to %s\n' "$file" >&2
        rm -f "$tmp"
        return 1
    fi

    # Verify the value actually landed. Guards against the silent-no-op failure
    # mode seen in the progress-tracker rewrite (assessment F2).
    local readback
    readback=$(state_get "$key")
    if [[ "$readback" != "$value" ]]; then
        printf '❌ Error: state write verification failed for %s\n' "$key" >&2
        printf '   expected: %s\n' "$value" >&2
        printf '   actual:   %s\n' "$readback" >&2
        return 1
    fi

    return 0
}

# state_init
# Creates a state file with the schema version if absent. Idempotent.
state_init() {
    local file
    file=$(_state_file)
    if [[ ! -f "$file" ]]; then
        state_set schema_version "$SDD_STATE_SCHEMA_VERSION" || return 1
    fi
    return 0
}

# resolve_phase_folder <value>
# Maps a possibly-prose phase reference onto a real spec folder name.
#
# Exists because legacy active-context.md stores a human title
# ("Phase 002 - Skills Management") where a folder name is required
# ("phase-002-skills-management"), and phase.sh used that string directly as a
# path (assessment F1). Prints the folder name, or nothing if unresolvable.
resolve_phase_folder() {
    local value="$1"
    local root specs_dir
    root=$(git rev-parse --show-toplevel 2>/dev/null || printf '.')
    specs_dir="$root/.sdd/specs/active"

    [[ -n "$value" ]] || return 0
    [[ -d "$specs_dir" ]] || return 0

    # Exact folder match: already correct.
    if [[ -d "$specs_dir/$value" ]]; then
        printf '%s' "$value"
        return 0
    fi

    # Derive a slug from prose: lowercase, non-alphanumerics to hyphens,
    # collapse and trim hyphens. "Phase 002 - Skills Management"
    #   -> "phase-002-skills-management"
    local slug
    slug=$(printf '%s' "$value" \
        | tr '[:upper:]' '[:lower:]' \
        | sed -e 's/[^a-z0-9]\{1,\}/-/g' -e 's/^-*//' -e 's/-*$//')

    if [[ -n "$slug" && -d "$specs_dir/$slug" ]]; then
        printf '%s' "$slug"
        return 0
    fi

    # Fall back to matching on the phase number alone, which survives a renamed
    # slug. Only accept an unambiguous single match.
    local num matches count
    num=$(printf '%s' "$value" | grep -oE '[0-9]{1,4}' | head -n1)
    if [[ -n "$num" ]]; then
        # Zero-pad to 3 to match the naming convention.
        local padded
        padded=$(printf '%03d' "$num" 2>/dev/null || printf '%s' "$num")
        matches=$(find "$specs_dir" -mindepth 1 -maxdepth 1 -type d \
                    -name "phase-${padded}-*" 2>/dev/null)
        count=$(printf '%s\n' "$matches" | grep -c . || true)
        if [[ "$count" -eq 1 ]]; then
            basename "$matches"
            return 0
        fi
    fi

    return 0
}

# state_migrate
# One-time upgrade from prose-only state to the state file (REQ-003.3.5).
# Reads the legacy active-context.md, resolves the phase to a real folder, and
# records it. Non-destructive: never edits active-context.md.
state_migrate() {
    local root ctx
    root=$(git rev-parse --show-toplevel 2>/dev/null || printf '.')
    ctx="$root/.sdd/memory/current-state/active-context.md"

    state_init || return 1

    # Already migrated.
    if [[ -n "$(state_get active_phase)" ]]; then
        return 0
    fi

    [[ -f "$ctx" ]] || return 0

    local raw folder branch
    raw=$(grep -E '^\*\*Current Phase:\*\*' "$ctx" 2>/dev/null \
            | sed -E 's/^\*\*Current Phase:\*\*[[:space:]]*//' \
            | sed -E 's/[[:space:]]*$//' | head -n1)

    # Ignore the unfilled template placeholder.
    case "$raw" in
        ''|'[Phase N - Name]') return 0 ;;
    esac

    folder=$(resolve_phase_folder "$raw")
    if [[ -z "$folder" ]]; then
        printf '⚠️  Warning: could not resolve active phase %s to a spec folder.\n' \
            "'$raw'" >&2
        printf '   Set it explicitly with: phase.sh start <phase-folder-name>\n' >&2
        return 0
    fi

    state_set active_phase "$folder" || return 1

    branch=$(grep -E '^\*\*Branch:\*\*' "$ctx" 2>/dev/null \
            | sed -E 's/^\*\*Branch:\*\*[[:space:]]*//' \
            | sed -E 's/[[:space:]]*$//' | head -n1)
    case "$branch" in
        ''|'[branch-name]') ;;
        *) state_set branch "$branch" || return 1 ;;
    esac

    printf '🔄 Migrated sprint state: active_phase=%s\n' "$folder" >&2
    return 0
}

# get_active_phase
# The single accessor every command should use. Migrates on first call, so
# existing projects upgrade transparently.
get_active_phase() {
    local phase
    phase=$(state_get active_phase)
    if [[ -z "$phase" ]]; then
        state_migrate >/dev/null 2>&1
        phase=$(state_get active_phase)
    fi
    printf '%s' "$phase"
}
