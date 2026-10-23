#!/usr/bin/env bash
# SDD Phase Runner - Manage active specifications sprints
# Enforces before-task, during-task, and after-task workflows programmatically

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/state.sh" ]]; then
    source "$SCRIPT_DIR/state.sh"
fi

if [[ -f "$SCRIPT_DIR/common.sh" ]]; then
    source "$SCRIPT_DIR/common.sh"
else
    # Fallback git root resolution if common.sh is not loaded yet
    get_repo_root() {
        git rev-parse --show-toplevel 2>/dev/null || echo "."
    }
fi

REPO_ROOT=$(get_repo_root)
TARGET_DIR="$REPO_ROOT/.sdd"
ACTIVE_CONTEXT="$TARGET_DIR/memory/current-state/active-context.md"
PROGRESS_TRACKER="$TARGET_DIR/memory/progress-tracker.md"

say() {
    printf "%s\n" "$1"
}

# ------------------------------------------------------------------------------
# update_progress_tracker <phase_name> <new_status>
#
# Sets the Status line under a phase's heading in progress-tracker.md.
#
# Previously this was duplicated in cmd_start and cmd_finish, and both copies
# silently no-opped when the tracker did not use the expected
# "### Phase N" + "- **Status:**" shape -- reporting success while changing
# nothing (assessment F2). The tracker is freeform prose, so rather than force a
# format, this reports honestly whether the anchor was found.
#
# Returns 0 if updated, 1 if the anchor was absent (caller decides severity).
# ------------------------------------------------------------------------------
update_progress_tracker() {
    local phase_name="$1"
    local new_status="$2"

    [[ -f "$PROGRESS_TRACKER" ]] || return 1

    local clean_phase_num
    clean_phase_num=$(printf '%s' "$phase_name" | grep -oE "phase-[0-9]+" | cut -d- -f2 | sed 's/^0*//')
    [[ -z "$clean_phase_num" ]] && clean_phase_num="[0-9]+"

    local tracker_header_regex="^###[[:space:]]+Phase[[:space:]]+0*${clean_phase_num}"
    local status_line_regex="^-[[:space:]]+\*\*Status:\*\*"

    local temp_tracker="${PROGRESS_TRACKER}.tmp.$$"
    # Truncate explicitly. The old code used >> against a fixed .tmp name, so a
    # leftover temp file from an interrupted run would corrupt the result.
    : > "$temp_tracker" || {
        say "❌ Error: cannot stage progress-tracker write: $temp_tracker"
        return 1
    }

    local in_phase=false
    local did_update=false

    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ "$line" =~ $tracker_header_regex ]]; then
            printf '%s\n' "$line" >> "$temp_tracker"
            in_phase=true
        elif [[ "$in_phase" == true && "$line" =~ $status_line_regex ]]; then
            printf -- '- **Status:** %s\n' "$new_status" >> "$temp_tracker"
            in_phase=false
            did_update=true
        else
            printf '%s\n' "$line" >> "$temp_tracker"
        fi
    done < "$PROGRESS_TRACKER"

    if [[ "$did_update" != true ]]; then
        rm -f "$temp_tracker"
        return 1
    fi

    if ! mv "$temp_tracker" "$PROGRESS_TRACKER"; then
        say "❌ Error: cannot commit progress-tracker write."
        rm -f "$temp_tracker"
        return 1
    fi

    # Verify the value actually landed rather than trusting the rewrite.
    if grep -qE "^-[[:space:]]+\*\*Status:\*\*[[:space:]]*${new_status}" "$PROGRESS_TRACKER"; then
        return 0
    fi

    say "❌ Error: progress-tracker write verification failed."
    return 1
}

# report_tracker_result <rc> <phase_name> <status>
# Turns the silent no-op into a visible, actionable message.
report_tracker_result() {
    local rc="$1" phase_name="$2" status="$3"
    if [[ "$rc" -eq 0 ]]; then
        say "📊 Progress tracker status updated to '$status'."
    else
        say "⚠️  Progress tracker NOT updated (no '### Phase N' + '- **Status:**' entry"
        say "    found for '$phase_name' in $PROGRESS_TRACKER)."
        say "    Update it by hand, or add a matching entry so this can be automated."
    fi
}

show_usage() {
    say "SDD Phase Sprint Runner"
    say ""
    say "Usage: $0 <command> [args]"
    say ""
    say "Commands:"
    say "  new <phase-name>            Create a phase and scaffold requirements.md"
    say "  approve <artifact> [phase]  Approve requirements, design, or tasks"
    say "  start <phase-name>          Initialize and start an approved phase sprint"
    say "  status                      Check completion status of the active phase sprint"
    say "  task <task_id> <status>     Update a task status (done, doing, todo) in tasks.md"
    say "  finish                      Verify codebase and complete the active sprint"
    say "  archive <phase-name>        Archive the completed phase folder (explicit action)"
    say ""
    say "Examples:"
    say "  $0 new phase-003-framework-hardening"
    say "  $0 approve requirements"
    say "  $0 approve design"
    say "  $0 approve tasks"
    say "  $0 start phase-003-framework-hardening"
    say "  $0 task T003.1 doing"
    say "  $0 task T003.1 done"
    say "  $0 status"
    say "  $0 finish"
    say "  $0 archive phase-003-framework-hardening"
    exit 1
}

# Return the configured spec-folder regex, with the framework default as a
# fallback. This was previously duplicated inside cmd_start.
get_spec_regex() {
    local regex="^phase-[0-9]{3}-[a-z0-9-]+$"
    local rules_file="$TARGET_DIR/memory/rules/spec-naming.md"
    if [[ -f "$rules_file" ]]; then
        local configured
        configured=$(grep -i "^Regex:" "$rules_file" | head -n1 | cut -d: -f2- | xargs)
        [[ -n "$configured" ]] && regex="$configured"
    fi
    printf '%s' "$regex"
}

validate_phase_name() {
    local phase_name="$1"
    local regex
    regex=$(get_spec_regex)
    if [[ ! "$phase_name" =~ $regex ]]; then
        say "❌ Error: Phase name '$phase_name' does not match naming regex: $regex"
        return 1
    fi
}

# Seed typed approval state from an existing spec once. This is a compatibility
# bridge for specs created before `phase.sh approve` existed. New approvals are
# always recorded through the command below.
select_spec() {
    local phase_name="$1"
    local current
    current=$(state_get current_spec)

    if [[ "$current" != "$phase_name" ]]; then
        state_set current_spec "$phase_name" || return 1
        state_set requirements_approved "" || return 1
        state_set design_approved "" || return 1
        state_set tasks_approved "" || return 1
    fi

    local spec_dir="$TARGET_DIR/specs/active/$phase_name"
    local today
    today=$(date -u +%F)

    if [[ -z "$(state_get requirements_approved)" && -f "$spec_dir/requirements.md" ]] &&
       grep -qi "status:.*\(approved\|complete\)" "$spec_dir/requirements.md"; then
        state_set requirements_approved "$today" || return 1
    fi
    if [[ -z "$(state_get design_approved)" && -f "$spec_dir/design.md" ]] &&
       grep -qi "status:.*\(approved\|complete\)" "$spec_dir/design.md"; then
        state_set design_approved "$today" || return 1
    fi
    if [[ -z "$(state_get tasks_approved)" && -f "$spec_dir/tasks.md" ]] &&
       grep -qi "status:.*\(ready to start\|approved\|complete\)" "$spec_dir/tasks.md"; then
        state_set tasks_approved "$today" || return 1
    fi
}

# Copy one canonical template and replace the common phase placeholders.
# Only called after the previous artifact is approved, preserving the mandatory
# requirements -> design -> tasks order.
scaffold_artifact() {
    local phase_name="$1" artifact="$2"
    local template="$TARGET_DIR/templates/${artifact}-template.md"
    local destination="$TARGET_DIR/specs/active/$phase_name/${artifact}.md"

    if [[ ! -f "$template" ]]; then
        say "❌ Error: template not found: $template"
        return 1
    fi
    if [[ -e "$destination" ]]; then
        say "ℹ️  $artifact.md already exists; leaving it unchanged."
        return 0
    fi

    local number slug title today
    number=$(printf '%s' "$phase_name" | sed -E 's/^phase-([0-9]+)-.*/\1/')
    slug=$(printf '%s' "$phase_name" | sed -E 's/^phase-[0-9]+-//')
    title=$(printf '%s' "$slug" | tr '-' ' ' | awk '{ for (i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2); print }')
    today=$(date -u +%F)

    sed \
        -e "s/\[Date or Pending\]/Pending/g" \
        -e "s/\[PHASE NAME\]/Phase $number - $title/g" \
        -e "s/\[Phase N\]/Phase $number/g" \
        -e "s/\[Name\]/$title/g" \
        -e "s/\[N\]/$number/g" \
        -e "s/\[Date\]/$today/g" \
        "$template" > "$destination" || {
            rm -f "$destination"
            say "❌ Error: failed to scaffold $destination"
            return 1
        }

    say "✅ Created $destination"
}

set_artifact_status() {
    local file="$1" status="$2" approved="$3"
    local tmp="${file}.tmp.$$"
    awk -v status="$status" -v approved="$approved" '
        BEGIN { status_done=0; approved_done=0 }
        /^\*\*Status:\*\*/ && !status_done {
            print "**Status:** " status
            status_done=1
            next
        }
        /^\*\*Approved:\*\*/ && !approved_done {
            print "**Approved:** " approved
            approved_done=1
            next
        }
        { print }
    ' "$file" > "$tmp" || {
        rm -f "$tmp"
        return 1
    }
    mv "$tmp" "$file"
}

# ------------------------------------------------------------------------------
# COMMAND: NEW
# ------------------------------------------------------------------------------
cmd_new() {
    local phase_name="$1"
    if [[ -z "$phase_name" ]]; then
        say "❌ Error: Missing phase name. Usage: $0 new <phase-name>"
        exit 1
    fi
    validate_phase_name "$phase_name" || exit 1

    local spec_dir="$TARGET_DIR/specs/active/$phase_name"
    if [[ -d "$spec_dir" ]]; then
        say "❌ Error: spec already exists: $spec_dir"
        exit 1
    fi

    mkdir -p "$spec_dir"
    state_init || exit 1
    state_set current_spec "$phase_name" || exit 1
    state_set requirements_approved "" || exit 1
    state_set design_approved "" || exit 1
    state_set tasks_approved "" || exit 1

    scaffold_artifact "$phase_name" requirements || exit 1
    say ""
    say "Next: review requirements.md, then run:"
    say "  bash $0 approve requirements"
}

# ------------------------------------------------------------------------------
# COMMAND: APPROVE
# ------------------------------------------------------------------------------
cmd_approve() {
    local artifact="$1"
    local phase_name="${2:-$(state_get current_spec)}"

    case "$artifact" in
        requirements|design|tasks) ;;
        *)
            say "❌ Error: choose one artifact: requirements, design, or tasks"
            exit 1
            ;;
    esac

    if [[ -z "$phase_name" ]]; then
        say "❌ Error: no current spec. Run 'phase.sh new <phase>' or pass a phase name."
        exit 1
    fi
    validate_phase_name "$phase_name" || exit 1

    local spec_dir="$TARGET_DIR/specs/active/$phase_name"
    local file="$spec_dir/$artifact.md"
    if [[ ! -f "$file" ]]; then
        say "❌ Error: $file does not exist. Artifacts must be created in order."
        exit 1
    fi

    select_spec "$phase_name" || exit 1
    local today
    today=$(date -u +%F)

    case "$artifact" in
        requirements)
            set_artifact_status "$file" "✅ APPROVED" "$today" || exit 1
            state_set requirements_approved "$today" || exit 1
            scaffold_artifact "$phase_name" design || exit 1
            say "Next: review design.md, then run: bash $0 approve design"
            ;;
        design)
            if [[ -z "$(state_get requirements_approved)" ]]; then
                say "❌ Error: requirements must be approved before design."
                exit 1
            fi
            set_artifact_status "$file" "✅ APPROVED" "$today" || exit 1
            state_set design_approved "$today" || exit 1
            scaffold_artifact "$phase_name" tasks || exit 1
            say "Next: review tasks.md, then run: bash $0 approve tasks"
            ;;
        tasks)
            if [[ -z "$(state_get design_approved)" ]]; then
                say "❌ Error: design must be approved before tasks."
                exit 1
            fi
            set_artifact_status "$file" "🚀 READY TO START" "$today" || exit 1
            state_set tasks_approved "$today" || exit 1
            say "✅ Spec approved. Start it with: bash $0 start $phase_name"
            ;;
    esac
}

# ------------------------------------------------------------------------------
# COMMAND: START
# ------------------------------------------------------------------------------
cmd_start() {
    local phase_name="$1"
    if [[ -z "$phase_name" ]]; then
        say "❌ Error: Missing phase name."
        show_usage
    fi

    validate_phase_name "$phase_name" || exit 1

    local spec_dir="$TARGET_DIR/specs/active/$phase_name"
    local backlog_dir="$TARGET_DIR/specs/backlog/$phase_name"

    # Move from backlog if present
    if [[ ! -d "$spec_dir" && -d "$backlog_dir" ]]; then
        say "🚚 Moving '$phase_name' from backlog to active specs..."
        mv "$backlog_dir" "$spec_dir"
    fi

    if [[ ! -d "$spec_dir" ]]; then
        say "❌ Error: Spec directory not found under .sdd/specs/active/$phase_name"
        exit 1
    fi

    local req_file="$spec_dir/requirements.md"
    local des_file="$spec_dir/design.md"
    local tsk_file="$spec_dir/tasks.md"

    # Verify spec triplet exists
    if [[ ! -f "$req_file" ]]; then
        say "❌ Error: requirements.md is missing from '$phase_name'"
        exit 1
    fi
    if [[ ! -f "$des_file" ]]; then
        say "❌ Error: design.md is missing from '$phase_name'"
        exit 1
    fi
    if [[ ! -f "$tsk_file" ]]; then
        say "❌ Error: tasks.md is missing from '$phase_name'"
        exit 1
    fi

    # Typed approvals are the gate. For pre-v1.4 specs, select_spec imports an
    # existing APPROVED/COMPLETE status once as a compatibility bridge.
    select_spec "$phase_name" || exit 1

    local req_approved=false
    local des_approved=false
    local tsk_ready=false
    [[ -n "$(state_get requirements_approved)" ]] && req_approved=true
    [[ -n "$(state_get design_approved)" ]]       && des_approved=true
    [[ -n "$(state_get tasks_approved)" ]]        && tsk_ready=true

    if [[ "$req_approved" == false || "$des_approved" == false || "$tsk_ready" == false ]]; then
        say "❌ Error: Cannot start '$phase_name'; all spec artifacts must be approved."
        say "   Requirements: $([[ "$req_approved" == true ]] && echo APPROVED || echo DRAFT)"
        say "   Design:       $([[ "$des_approved" == true ]] && echo APPROVED || echo DRAFT)"
        say "   Tasks:        $([[ "$tsk_ready" == true ]] && echo APPROVED || echo DRAFT)"
        say "   Use 'phase.sh approve <artifact> $phase_name' in order."
        exit 1
    fi

    # Doctor is a hard pre-flight gate. A governance tool must not continue
    # after its own structural validator fails.
    say "🔍 Running project doctor pre-flight checks..."
    if [[ -f "$SCRIPT_DIR/doctor.sh" ]] && ! bash "$SCRIPT_DIR/doctor.sh"; then
        say "❌ Error: project doctor failed. Resolve the findings before starting."
        exit 1
    fi

    # Determine branch
    local branch_name="feat/$phase_name"
    say "🌿 Git Branch Setup..."
    local current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "master")
    if [[ "$current_branch" != "$branch_name" ]]; then
        # Check if local branch already exists
        if git show-ref --verify --quiet "refs/heads/$branch_name"; then
            say "   Switching to existing branch '$branch_name'..."
            git checkout "$branch_name"
        else
            say "   Creating and switching to feature branch '$branch_name'..."
            git checkout -b "$branch_name"
        fi
    else
        say "   Already on branch '$branch_name'"
    fi

    # Record machine-readable state first. This is the source of truth; the
    # markdown below is a rendering of it (REQ-003.3.3).
    say "🗃️  Recording sprint state..."
    state_init || exit 1
    state_set active_phase "$phase_name" || exit 1
    state_set branch "$branch_name" || exit 1
    state_set started "$(date -u +%Y-%m-%dT%H:%M:%SZ)" || exit 1
    [[ "$req_approved" == true ]] && state_set requirements_approved "$(date -u +%F)"
    [[ "$des_approved" == true ]] && state_set design_approved "$(date -u +%F)"
    [[ "$tsk_ready" == true ]]    && state_set tasks_approved "$(date -u +%F)"

    # Update active-context.md
    say "📝 Registering active context..."
    mkdir -p "$(dirname "$ACTIVE_CONTEXT")"
    cat > "$ACTIVE_CONTEXT" <<EOF
# Active Context

**Current Phase:** $phase_name  
**Current Task:** [None]  
**Branch:** $branch_name

## Focus
- Implement specifications for $phase_name

## Recent Decisions
- Sprint initialized using phase.sh start command

## Open Questions
- [None]
EOF

    if update_progress_tracker "$phase_name" "In Progress"; then
        report_tracker_result 0 "$phase_name" "In Progress"
    else
        report_tracker_result 1 "$phase_name" "In Progress"
    fi

    say ""
    say "🚀 Phase Sprint '$phase_name' started successfully!"
    say ""
    say "📋 Copy and post this checklist to start:"
    say ""
    say "=========================================================="
    say "BEFORE-TASK CHECKLIST COMPLETE"
    say ""
    say "Category: Phase Sprint"
    say "Branch: $branch_name"
    say "Requirements: $([[ "$req_approved" == true ]] && echo "✅ Approved" || echo "⚠️ DRAFT")"
    say "Design:       $([[ "$des_approved" == true ]] && echo "✅ Approved" || echo "⚠️ DRAFT")"
    say "Tasks:        $([[ "$tsk_ready" == true ]] && echo "✅ Validated" || echo "⚠️ DRAFT")"
    say "Testing Strategy: Self-verification and integration testing"
    say "Dependencies: None"
    say "Backward Compatibility: ✅ Checked"
    say ""
    say "Ready to proceed. Awaiting START confirmation."
    say "=========================================================="
}

# ------------------------------------------------------------------------------
# COMMAND: STATUS / PROGRESS
# ------------------------------------------------------------------------------
cmd_status() {
    if [[ ! -f "$ACTIVE_CONTEXT" ]]; then
        say "ℹ️  No active context found. Start a sprint using: phase.sh start <phase>"
        exit 0
    fi

    # Active phase comes from machine-readable state, never from prose. Reading
    # it out of active-context.md and using it as a directory path was
    # assessment finding F1.
    local active_phase=$(get_active_phase)
    local current_task=$(grep -E "^\*\*Current Task:\*\*" "$ACTIVE_CONTEXT" | sed -E 's/^\*\*Current Task:\*\*[[:space:]]*//' | xargs)
    local active_branch=$(state_get branch)
    if [[ -z "$active_branch" ]]; then
        active_branch=$(get_current_branch 2>/dev/null || printf 'unknown')
    fi

    if [[ -z "$active_phase" ]]; then
        say "ℹ️  No active phase sprint is registered."
        say "   Start one with: phase.sh start <phase-folder-name>"
        exit 0
    fi

    local tasks_file="$TARGET_DIR/specs/active/$active_phase/tasks.md"
    if [[ ! -f "$tasks_file" ]]; then
        say "❌ Error: Active tasks.md not found at '$tasks_file'"
        exit 1
    fi

    # Count tasks
    local total_tasks=$(grep -c -E "^[[:space:]]*-[[:space:]]+\[[ xX/]\]" "$tasks_file" || true)
    local completed_tasks=$(grep -c -E "^[[:space:]]*-[[:space:]]+\[[xX]\]" "$tasks_file" || true)
    local in_progress_tasks=$(grep -c -E "^[[:space:]]*-[[:space:]]+\[/\]" "$tasks_file" || true)
    local todo_tasks=$(grep -c -E "^[[:space:]]*-[[:space:]]+\[[[:space:]]\]" "$tasks_file" || true)

    local percent=0
    if [[ "$total_tasks" -gt 0 ]]; then
        percent=$(( completed_tasks * 100 / total_tasks ))
    fi

    say "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    say "🏃 Active Phase Sprint: $active_phase"
    say "🌿 Current Branch:     $active_branch"
    say "🎯 Active Task Focus:   $current_task"
    say "📊 Progress:           $percent% ($completed_tasks / $total_tasks tasks complete)"
    say "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [[ "$in_progress_tasks" -gt 0 ]]; then
        say ""
        say "🟡 In Progress Tasks:"
        grep -E "^[[:space:]]*-[[:space:]]+\[/\]" "$tasks_file" | sed 's/^[[:space:]]*- //g'
    fi

    if [[ "$todo_tasks" -gt 0 ]]; then
        say ""
        say "🔵 Pending Tasks:"
        grep -E "^[[:space:]]*-[[:space:]]+\[[[:space:]]\]" "$tasks_file" | sed 's/^[[:space:]]*- //g' | head -n 10
        if [[ "$todo_tasks" -gt 10 ]]; then
            say "   ... and $((todo_tasks - 10)) more tasks"
        fi
    fi
}

# ------------------------------------------------------------------------------
# COMMAND: TASK
# ------------------------------------------------------------------------------
cmd_task() {
    local task_id="$1"
    local status_arg="$2"

    if [[ -z "$task_id" || -z "$status_arg" ]]; then
        say "❌ Error: Missing task identifier or status."
        say "Usage: $0 task <task_id_or_match_text> <done|doing|todo>"
        exit 1
    fi

    local active_phase=$(get_active_phase)
    if [[ -z "$active_phase" ]]; then
        say "❌ Error: No active phase sprint registered. Run start first."
        exit 1
    fi

    local tasks_file="$TARGET_DIR/specs/active/$active_phase/tasks.md"
    if [[ ! -f "$tasks_file" ]]; then
        say "❌ Error: tasks.md not found at '$tasks_file'"
        exit 1
    fi

    local replacement=" "
    case "$status_arg" in
        done)  replacement="x" ;;
        doing) replacement="/" ;;
        todo)  replacement=" " ;;
        *)
            say "❌ Error: Invalid status '$status_arg'. Choose from: done, doing, todo"
            exit 1
            ;;
    esac

    # Stable IDs (for example T003.1) are matched as a delimited token.
    # Legacy free-text tasks remain supported, but only when the match is unique.
    local needle="$task_id"
    case "$task_id" in
        T[0-9]*.*) needle="[$task_id]" ;;
    esac

    local matches match_count matched_line
    matches=$(grep -F "$needle" "$tasks_file" 2>/dev/null \
        | grep -E "^[[:space:]]*-[[:space:]]*\[[ xX/]\]" || true)
    match_count=$(printf '%s\n' "$matches" | grep -c . || true)

    if [[ "$match_count" -eq 0 ]]; then
        matches=$(grep -i "$needle" "$tasks_file" 2>/dev/null \
            | grep -E "^[[:space:]]*-[[:space:]]*\[[ xX/]\]" || true)
        match_count=$(printf '%s\n' "$matches" | grep -c . || true)
    fi

    if [[ "$match_count" -eq 0 ]]; then
        say "❌ Error: No checklist task matching '$task_id' was found in tasks.md."
        exit 1
    fi
    if [[ "$match_count" -gt 1 ]]; then
        say "❌ Error: '$task_id' matches $match_count tasks. Use a stable task ID:"
        printf '%s\n' "$matches"
        exit 1
    fi

    matched_line="$matches"
    say "🎯 Found task: $matched_line"

    local updated_line=""
    local checklist_line_regex="^([[:space:]]*-)[[:space:]]*\[[ xX/]\](.*)$"
    if [[ "$matched_line" =~ $checklist_line_regex ]]; then
        local prefix="${BASH_REMATCH[1]}"
        local suffix="${BASH_REMATCH[2]}"
        updated_line="$prefix [$replacement]$suffix"
    else
        say "❌ Error: Matched line does not fit standard checklist format: $matched_line"
        exit 1
    fi

    local temp_tasks="${tasks_file}.tmp.$$"
    : > "$temp_tasks" || {
        say "❌ Error: cannot stage tasks.md update."
        exit 1
    }
    local replacements=0
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ "$line" == "$matched_line" ]]; then
            say "$updated_line" >> "$temp_tasks"
            replacements=$((replacements + 1))
        else
            say "$line" >> "$temp_tasks"
        fi
    done < "$tasks_file"

    if [[ "$replacements" -ne 1 ]]; then
        rm -f "$temp_tasks"
        say "❌ Error: expected to update exactly one task; updated $replacements."
        exit 1
    fi
    mv "$temp_tasks" "$tasks_file"

    local task_text=$(echo "$updated_line" | sed -E 's/^[[:space:]]*-?[[:space:]]*\[[x /]\][[:space:]]*//' | sed 's/^[[:space:]]*\*\*[^*]*\*\*//g' | xargs)

    local temp_context="${ACTIVE_CONTEXT}.tmp"
    local current_task_regex="^\*\*Current[[:space:]]+Task:\*\*"
    local primary_objective_regex="^-[[:space:]]\[Primary[[:space:]]+objective\]"

    while IFS= read -r line; do
        if [[ "$line" =~ $current_task_regex ]]; then
            if [[ "$status_arg" == "doing" || "$status_arg" == "done" ]]; then
                say "**Current Task:** $task_id - $task_text" >> "$temp_context"
            else
                say "**Current Task:** [None]" >> "$temp_context"
            fi
        elif [[ "$line" =~ $primary_objective_regex ]]; then
            if [[ "$status_arg" == "doing" ]]; then
                say "- Working on: $task_text" >> "$temp_context"
            else
                say "- [Primary objective]" >> "$temp_context"
            fi
        else
            say "$line" >> "$temp_context"
        fi
    done < "$ACTIVE_CONTEXT"
    mv "$temp_context" "$ACTIVE_CONTEXT"

    say "✅ Updated task checkbox status to '$status_arg'."
    say "📝 Synced active context."
}

# ------------------------------------------------------------------------------
# COMMAND: FINISH
# ------------------------------------------------------------------------------
cmd_finish() {
    local active_phase=$(get_active_phase)
    if [[ -z "$active_phase" ]]; then
        say "❌ Error: No active phase sprint registered. Nothing to finish."
        exit 1
    fi

    local tasks_file="$TARGET_DIR/specs/active/$active_phase/tasks.md"
    if [[ ! -f "$tasks_file" ]]; then
        say "❌ Error: tasks.md not found at '$tasks_file'"
        exit 1
    fi

    local open_tasks=$(grep -c -E "^[[:space:]]*-[[:space:]]+\[[ /]\]" "$tasks_file" || true)
    if [[ "$open_tasks" -gt 0 ]]; then
        say "❌ Error: Cannot complete sprint. There are $open_tasks tasks still open or in progress:"
        grep -E "^[[:space:]]*-[[:space:]]+\[[ /]\]" "$tasks_file"
        exit 1
    fi

    say "🔍 Running quality gates and project validations..."
    
    if [[ -f "$SCRIPT_DIR/doctor.sh" ]]; then
        if ! bash "$SCRIPT_DIR/doctor.sh"; then
            say "❌ Validation failed: doctor.sh reported errors. Resolve before completing the phase."
            exit 1
        fi
    fi

    if [[ -f "$SCRIPT_DIR/skills.sh" ]]; then
        if ! bash "$SCRIPT_DIR/skills.sh" validate; then
            say "❌ Validation failed: skills.sh validate reported errors. Resolve before completing the phase."
            exit 1
        fi
    fi

    if update_progress_tracker "$active_phase" "Complete"; then
        report_tracker_result 0 "$active_phase" "Complete"
    else
        report_tracker_result 1 "$active_phase" "Complete"
    fi

    # Clear active context
    cat > "$ACTIVE_CONTEXT" <<EOF
# Active Context

**Current Phase:** [Phase N - Name]  
**Current Task:** [Task ID - Title]  
**Branch:** [branch-name]

## Focus
- [Primary objective]
- [Secondary objective]

## Recent Decisions
- [Decision]

## Open Questions
- [Question]
EOF
    say "📝 Active context cleared."

    # Clear sprint state so a stale active_phase cannot outlive the sprint.
    state_set active_phase "" || exit 1
    state_set branch "" || exit 1
    state_set requirements_approved "" || exit 1
    state_set design_approved "" || exit 1
    state_set tasks_approved "" || exit 1
    say "🗃️  Sprint state cleared."

    # Optional derived graph cache; core lifecycle remains usable without Node.
    if command -v node >/dev/null 2>&1 && [[ -f "$SCRIPT_DIR/graph-refresh.cjs" ]]; then
        if ! node "$SCRIPT_DIR/graph-refresh.cjs" "$REPO_ROOT"; then
            say "WARNING: Graph refresh failed; run node .sdd/scripts/graph-refresh.cjs after resolving the error."
        fi
    else
        say "INFO: Graph refresh skipped (Node or graph-refresh.cjs unavailable); visual workspace derives live graphs when opened."
    fi

    say ""
    say "🎉 Phase Sprint '$active_phase' marked as finished!"
    say "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    say "Next Steps:"
    say "  1. Update CHANGELOG.md."
    say "  2. Submit your PR and squash commits."
    say "  3. Once approved, you can archive this spec folder by running:"
    say "     bash $0 archive $active_phase"
    say "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ------------------------------------------------------------------------------
# COMMAND: ARCHIVE
# ------------------------------------------------------------------------------
cmd_archive() {
    local phase_name="$1"
    if [[ -z "$phase_name" ]]; then
        say "❌ Error: Missing phase name to archive."
        exit 1
    fi

    local active_dir="$TARGET_DIR/specs/active/$phase_name"
    local archive_dir="$TARGET_DIR/specs/archive/$phase_name"

    if [[ ! -d "$active_dir" ]]; then
        say "❌ Error: Spec directory '$phase_name' not found in active specs: $active_dir"
        exit 1
    fi

    say "📦 Archiving spec folder '$phase_name'..."
    mkdir -p "$(dirname "$archive_dir")"
    mv "$active_dir" "$archive_dir"

    say "✅ Spec folder '$phase_name' successfully moved to archive."
}

# ------------------------------------------------------------------------------
# ROUTING
#
# Guarded so this file can be sourced by tests without executing a command.
# When invoked through the .sdd/scripts/ symlink, BASH_SOURCE[0] and $0 are both
# the symlink path, so the comparison still holds.
# ------------------------------------------------------------------------------
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "$1" in
        new)
            cmd_new "$2"
            ;;
        approve)
            cmd_approve "$2"
            ;;
        start)
            cmd_start "$2"
            ;;
        status|progress)
            cmd_status
            ;;
        task)
            cmd_task "$2" "$3"
            ;;
        finish)
            cmd_finish
            ;;
        archive)
            cmd_archive "$2"
            ;;
        *)
            show_usage
            ;;
    esac
fi
