#!/usr/bin/env bash
# SDD Doctor - validate .sdd structure and key files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

REPO_ROOT=$(get_repo_root)
TARGET_DIR="$REPO_ROOT/.sdd"
ALT_DIR="$REPO_ROOT/.SDD"

ERRORS=0
WARNINGS=0

say() {
    printf "%s\n" "$1"
}

check_file() {
    local file="$1"
    local label="$2"
    if [[ -f "$file" ]]; then
        say "OK   $label"
        return 0
    else
        say "MISS $label"
        ERRORS=$((ERRORS+1))
        return 1
    fi
}

check_dir() {
    local dir="$1"
    local label="$2"
    if [[ -d "$dir" ]]; then
        say "OK   $label"
        return 0
    else
        say "MISS $label"
        ERRORS=$((ERRORS+1))
        return 1
    fi
}

say "SDD Doctor"

if [[ -d "$ALT_DIR" && ! -d "$TARGET_DIR" ]]; then
    say "WARN .SDD exists but .sdd is missing (case-sensitive issue)."
    WARNINGS=$((WARNINGS+1))
fi

if [[ ! -d "$TARGET_DIR" ]]; then
    say "MISS .sdd directory not found in repo root."
    exit 1
fi

say ""
say "Core Structure"
check_dir "$TARGET_DIR/specs" ".sdd/specs"
check_dir "$TARGET_DIR/specs/active" ".sdd/specs/active"
check_dir "$TARGET_DIR/specs/archive" ".sdd/specs/archive"
check_dir "$TARGET_DIR/specs/backlog" ".sdd/specs/backlog"
check_dir "$TARGET_DIR/templates" ".sdd/templates"
check_dir "$TARGET_DIR/scripts" ".sdd/scripts"
check_dir "$REPO_ROOT/skills" "skills"
check_dir "$TARGET_DIR/memory" ".sdd/memory"
check_dir "$TARGET_DIR/memory/rules" ".sdd/memory/rules"
check_dir "$TARGET_DIR/memory/current-state" ".sdd/memory/current-state"
check_dir "$TARGET_DIR/memory/completed-tasks" ".sdd/memory/completed-tasks"
check_dir "$TARGET_DIR/memory/governance" ".sdd/memory/governance"
check_dir "$TARGET_DIR/memory/archive" ".sdd/memory/archive"
check_dir "$TARGET_DIR/evidence" ".sdd/evidence"
check_dir "$TARGET_DIR/reports" ".sdd/reports"

say ""
say "Memory Files"
check_file "$TARGET_DIR/AGENT_ONBOARDING.md" ".sdd/AGENT_ONBOARDING.md"
check_file "$TARGET_DIR/constitution.md" ".sdd/constitution.md"
check_file "$TARGET_DIR/glossary.md" ".sdd/glossary.md"
check_file "$TARGET_DIR/framework.json" ".sdd/framework.json"
check_file "$TARGET_DIR/memory/project-overview.md" "memory/project-overview.md"
check_file "$TARGET_DIR/memory/progress-tracker.md" "memory/progress-tracker.md"
check_file "$TARGET_DIR/memory/technical-decisions.md" "memory/technical-decisions.md"
check_file "$TARGET_DIR/memory/current-state/active-context.md" "memory/current-state/active-context.md"
check_file "$TARGET_DIR/memory/current-state/progress.md" "memory/current-state/progress.md"
check_file "$TARGET_DIR/memory/rules/before-task.md" "memory/rules/before-task.md"
check_file "$TARGET_DIR/memory/rules/during-task.md" "memory/rules/during-task.md"
check_file "$TARGET_DIR/memory/rules/after-task.md" "memory/rules/after-task.md"
check_file "$TARGET_DIR/memory/rules/file-placement.md" "memory/rules/file-placement.md"
check_file "$TARGET_DIR/memory/rules/spec-naming.md" "memory/rules/spec-naming.md"

if [[ -f "$TARGET_DIR/memory/current-state/activeContext.md" ]]; then
    say "WARN Found legacy file: memory/current-state/activeContext.md"
    WARNINGS=$((WARNINGS+1))
fi

say ""
say "Templates"
check_file "$TARGET_DIR/templates/requirements-template.md" "templates/requirements-template.md"
check_file "$TARGET_DIR/templates/design-template.md" "templates/design-template.md"
check_file "$TARGET_DIR/templates/tasks-template.md" "templates/tasks-template.md"
check_file "$TARGET_DIR/templates/evidence-template.md" "templates/evidence-template.md"
check_file "$TARGET_DIR/templates/learning-template.md" "templates/learning-template.md"
check_file "$TARGET_DIR/templates/governance-exception-template.md" "templates/governance-exception-template.md"
check_file "$TARGET_DIR/templates/assessment-report-template.md" "templates/assessment-report-template.md"

say ""
say "Skills"
if [[ -d "$REPO_ROOT/skills" ]]; then
    SKILL_COUNT=$(find "$REPO_ROOT/skills" -type f -name "SKILL.md" | wc -l | xargs)
    if [[ "$SKILL_COUNT" -gt 0 ]]; then
        say "OK   skills/ ($SKILL_COUNT SKILL.md file(s))"
        for skill_dir in "$REPO_ROOT/skills"/*; do
            if [[ -d "$skill_dir" ]]; then
                skill_name=$(basename "$skill_dir")
                if [[ ! "$skill_name" =~ ^[a-z0-9-]+$ ]]; then
                    say "MISS Skill folder name '$skill_name' must be kebab-case."
                    ERRORS=$((ERRORS+1))
                    continue
                fi
                if [[ ! -f "$skill_dir/SKILL.md" ]]; then
                    say "MISS Skill '$skill_name' is missing SKILL.md."
                    ERRORS=$((ERRORS+1))
                    continue
                fi
                if ! grep -q "^name:" "$skill_dir/SKILL.md" || ! grep -q "^description:" "$skill_dir/SKILL.md"; then
                    say "MISS Skill '$skill_name' SKILL.md must have name and description in YAML frontmatter."
                    ERRORS=$((ERRORS+1))
                fi
            fi
        done
    else
        say "WARN skills/ has no SKILL.md files"
        WARNINGS=$((WARNINGS+1))
    fi
else
    say "MISS skills/ missing"
    ERRORS=$((ERRORS+1))
fi

if [[ -f "$TARGET_DIR/templates/requirements-template.md" ]]; then
    if ! grep -qi "Privacy & Security Model" "$TARGET_DIR/templates/requirements-template.md"; then
        say "WARN requirements-template.md missing Privacy & Security Model section"
        WARNINGS=$((WARNINGS+1))
    fi
fi

say ""
say "Agent Entry Points (Recommended)"
if [[ -f "$REPO_ROOT/AGENTS.md" ]]; then
    say "OK   AGENTS.md"
else
    say "WARN AGENTS.md missing (recommended for agent interoperability)"
    WARNINGS=$((WARNINGS+1))
fi

if [[ -f "$REPO_ROOT/CLAUDE.md" ]]; then
    say "OK   CLAUDE.md"
else
    say "WARN CLAUDE.md missing (optional, recommended)"
    WARNINGS=$((WARNINGS+1))
fi

if [[ -f "$REPO_ROOT/GEMINI.md" ]]; then
    say "OK   GEMINI.md"
else
    say "WARN GEMINI.md missing (optional, recommended)"
    WARNINGS=$((WARNINGS+1))
fi

if [[ -f "$REPO_ROOT/.gemini/GEMINI.md" ]]; then
    say "OK   .gemini/GEMINI.md"
else
    say "WARN .gemini/GEMINI.md missing (optional, recommended)"
    WARNINGS=$((WARNINGS+1))
fi

if [[ -f "$REPO_ROOT/.github/copilot-instructions.md" ]]; then
    say "OK   .github/copilot-instructions.md"
else
    say "WARN .github/copilot-instructions.md missing (optional, recommended)"
    WARNINGS=$((WARNINGS+1))
fi

PROFILE_FILE="$TARGET_DIR/.profile"
if [[ -f "$PROFILE_FILE" ]]; then
    PROFILE=$(cat "$PROFILE_FILE")
    say ""
    say "Profile: $PROFILE"

    if echo "$PROFILE" | grep -q "api"; then
        check_file "$TARGET_DIR/templates/api-design-template.md" "templates/api-design-template.md"
        check_file "$TARGET_DIR/templates/schema-template.md" "templates/schema-template.md"
    fi

    if echo "$PROFILE" | grep -q "cli"; then
        check_file "$TARGET_DIR/templates/command-design-template.md" "templates/command-design-template.md"
    fi

    if echo "$PROFILE" | grep -q "full-stack"; then
        check_file "$TARGET_DIR/templates/architecture-template.md" "templates/architecture-template.md"
        check_file "$TARGET_DIR/templates/integration-testing.md" "templates/integration-testing.md"
    fi

    if echo "$PROFILE" | grep -q "monorepo"; then
        check_dir "$TARGET_DIR/coordination" "coordination/"
        check_dir "$TARGET_DIR/coordination/apps" "coordination/apps/"
        check_dir "$TARGET_DIR/coordination/services" "coordination/services/"
        check_dir "$TARGET_DIR/coordination/progress" "coordination/progress/"
        check_file "$TARGET_DIR/coordination/progress/current-phase-status.md" "coordination/progress/current-phase-status.md"
        check_file "$TARGET_DIR/coordination/progress/weekly-updates.md" "coordination/progress/weekly-updates.md"
        check_file "$TARGET_DIR/coordination/blockers.md" "coordination/blockers.md"
        check_file "$TARGET_DIR/coordination/breaking-changes.md" "coordination/breaking-changes.md"
        check_file "$TARGET_DIR/memory/rules/monorepo-governance.md" "memory/rules/monorepo-governance.md"
    fi

    if echo "$PROFILE" | grep -q "devsecops"; then
        check_file "$TARGET_DIR/templates/security-design-template.md" "templates/security-design-template.md"
        check_file "$TARGET_DIR/templates/security-requirements.md" "templates/security-requirements.md"
    fi

    if echo "$PROFILE" | grep -q "mlops"; then
        check_file "$TARGET_DIR/templates/model-design-template.md" "templates/model-design-template.md"
        check_file "$TARGET_DIR/templates/dataset-card-template.md" "templates/dataset-card-template.md"
    fi
fi

say ""
say ""
say "Stray Spec Scan"
if "$SCRIPT_DIR/scan-strays.sh"; then
    say "OK   No stray specs detected"
else
    WARNINGS=$((WARNINGS+1))
fi

if [[ -f "$PROFILE_FILE" ]]; then
    if echo "$PROFILE" | grep -q "monorepo"; then
        say ""
        say "Monorepo Audit"
        if "$SCRIPT_DIR/audit-monorepo.sh"; then
            say "OK   Monorepo coordination audit passed"
        else
            say "MISS Monorepo coordination audit reported critical findings"
            ERRORS=$((ERRORS+1))
        fi
    fi
fi

say ""
say "Spec Naming Check"
SPEC_RULE="$TARGET_DIR/memory/rules/spec-naming.md"
SPEC_REGEX=""
if [[ -f "$SPEC_RULE" ]]; then
    SPEC_REGEX=$(grep -i "^Regex:" "$SPEC_RULE" | head -n1 | cut -d: -f2- | xargs)
fi
if [[ -z "$SPEC_REGEX" ]]; then
    SPEC_REGEX="^phase-[0-9]{3}-[a-z0-9-]+$"
    say "WARN spec-naming rule missing Regex; using default: $SPEC_REGEX"
    WARNINGS=$((WARNINGS+1))
fi

for scope in active archive backlog; do
    dir="$TARGET_DIR/specs/$scope"
    if [[ -d "$dir" ]]; then
        while IFS= read -r subdir; do
            name=$(basename "$subdir")
            if [[ "$name" == _* ]]; then
                continue
            fi
            if ! [[ "$name" =~ $SPEC_REGEX ]]; then
                say "MISS $scope spec folder '$name' does not match: $SPEC_REGEX"
                ERRORS=$((ERRORS+1))
            fi
        done < <(find "$dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null)
    fi
done

say ""
say "Spec Lifecycle Approval Gates"
active_dir="$TARGET_DIR/specs/active"
forward_threshold=0
if [[ -f "$TARGET_DIR/framework.json" ]]; then
    configured_threshold=$(grep -E '"forwardThreshold"[[:space:]]*:' "$TARGET_DIR/framework.json" | head -n1 | grep -oE '[0-9]+' || true)
    [[ -n "$configured_threshold" ]] && forward_threshold="$configured_threshold"
fi
if [[ -d "$active_dir" ]]; then
    while IFS= read -r subdir; do
        folder_name=$(basename "$subdir")
        if [[ "$folder_name" == _* ]]; then
            continue
        fi

        req_file="$subdir/requirements.md"
        des_file="$subdir/design.md"
        tsk_file="$subdir/tasks.md"

        phase_number=$(printf '%s' "$folder_name" | sed -E 's/^phase-([0-9]{3}).*/\1/' | sed 's/^0*//')
        [[ -z "$phase_number" ]] && phase_number=0

        req_approved=false
        des_approved=false
        tsk_ready=false

        # Check Requirements Approval
        if [[ -f "$req_file" ]]; then
            if grep -qi "status:.*approved" "$req_file" || grep -qi "status:.*complete" "$req_file"; then
                req_approved=true
            fi
        fi

        # Check Design Approval
        if [[ -f "$des_file" ]]; then
            if [[ ! -f "$req_file" ]]; then
                say "FAIL $folder_name: design.md exists but requirements.md is missing."
                ERRORS=$((ERRORS+1))
            elif [[ "$req_approved" == false ]]; then
                say "FAIL $folder_name: design.md exists but requirements.md is NOT approved (Status is not APPROVED)."
                ERRORS=$((ERRORS+1))
            fi

            if grep -qi "status:.*approved" "$des_file" || grep -qi "status:.*complete" "$des_file"; then
                des_approved=true
            fi
        fi

        # Check Tasks Approval
        if [[ -f "$tsk_file" ]]; then
            if [[ ! -f "$des_file" ]]; then
                say "FAIL $folder_name: tasks.md exists but design.md is missing."
                ERRORS=$((ERRORS+1))
            elif [[ "$des_approved" == false ]]; then
                say "FAIL $folder_name: tasks.md exists but design.md is NOT approved (Status is not APPROVED)."
                ERRORS=$((ERRORS+1))
            fi

            if grep -qi "status:.*ready to start" "$tsk_file" || grep -qi "status:.*approved" "$tsk_file" || grep -qi "status:.*complete" "$tsk_file"; then
                tsk_ready=true
            fi

            if [[ "$phase_number" -ge "$forward_threshold" ]]; then
                task_count=$(grep -cE '^[[:space:]]*-[[:space:]]*\[[ xX/]\][[:space:]]*\*\*\[T[0-9]{3}\.[0-9]+\]' "$tsk_file" || true)
                unique_count=$(grep -oE '\[T[0-9]{3}\.[0-9]+\]' "$tsk_file" | sort -u | wc -l | xargs)
                if [[ "$task_count" -eq 0 || "$task_count" -ne "$unique_count" ]]; then
                    say "FAIL $folder_name: governed tasks require unique stable IDs on every top-level checkbox."
                    ERRORS=$((ERRORS+1))
                fi
                for field in 'Objective and requirements' 'Implementation and owned outputs' 'Owned paths' 'Positive and negative verification' 'Acceptance evidence' 'No-go conditions and handoff'; do
                    field_count=$(grep -c "\*\*$field:\*\*" "$tsk_file" || true)
                    if [[ "$field_count" -ne "$task_count" ]]; then
                        say "FAIL $folder_name: '$field' appears $field_count times for $task_count governed tasks."
                        ERRORS=$((ERRORS+1))
                    fi
                done
            else
                say "INFO $folder_name: pre-threshold history (before phase $forward_threshold); no retroactive task certification."
            fi
        fi

        # Display progress status for information
        say "INFO $folder_name progress status:"
        if [[ -f "$req_file" ]]; then
            say "     - Requirements: $([[ "$req_approved" == true ]] && echo "APPROVED" || echo "DRAFT")"
        fi
        if [[ -f "$des_file" ]]; then
            say "     - Design:       $([[ "$des_approved" == true ]] && echo "APPROVED" || echo "DRAFT")"
        fi
        if [[ -f "$tsk_file" ]]; then
            say "     - Tasks:        $([[ "$tsk_ready" == true ]] && echo "READY" || echo "DRAFT")"
        fi

    done < <(find "$active_dir" -mindepth 1 -maxdepth 1 -type d 2>/dev/null)
fi

say ""
say "Spec Content Lint"
if command -v node >/dev/null 2>&1; then
    linter="$SCRIPT_DIR/validate-spec.cjs"
    if [[ ! -f "$linter" ]]; then
        say "MISS validate-spec.cjs not found at $linter"
        ERRORS=$((ERRORS+1))
    elif [[ -d "$active_dir" ]]; then
        lint_count=0
        while IFS= read -r spec_file; do
            [[ -f "$spec_file" ]] || continue
            lint_count=$((lint_count + 1))
            if node "$linter" "$spec_file"; then
                :
            else
                say "FAIL spec lint: ${spec_file#$REPO_ROOT/}"
                ERRORS=$((ERRORS+1))
            fi
        done < <(find "$active_dir" -mindepth 2 -maxdepth 2 -type f \
            \( -name 'requirements.md' -o -name 'design.md' \) 2>/dev/null | sort)
        if [[ "$lint_count" -eq 0 ]]; then
            say "INFO no active requirements/design files to lint"
        fi
    fi
else
    say "WARN node is unavailable; skipping profile-aware spec content lint"
    WARNINGS=$((WARNINGS+1))
fi

if [[ $ERRORS -eq 0 ]]; then
    say "Result: OK"
else
    say "Result: FAIL ($ERRORS missing)"
fi

if [[ $WARNINGS -gt 0 ]]; then
    say "Warnings: $WARNINGS"
fi

if [[ $ERRORS -ne 0 ]]; then
    exit 1
fi
