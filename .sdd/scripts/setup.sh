#!/bin/bash

# SDD Framework Setup Script
# Initializes the .sdd directory with chosen profile composition

set -e

# ==============================================================================
# CONSTANTS
# ==============================================================================

FRAMEWORK_SOURCE="${BASH_SOURCE%/*}/../"
TARGET_DIR=".sdd"
PROJECT_ROOT="$(pwd)"

VALID_BASES=("general" "web" "mobile" "api" "cli" "full-stack" "monorepo")
VALID_MODIFIERS=("devsecops" "mlops" "devops")

# ==============================================================================
# FUNCTIONS
# ==============================================================================

# Parse profile composition string (e.g., "web+devsecops+mlops")
parse_profile() {
    local composition=$1
    IFS='+' read -ra PARTS <<< "$composition"
    
    BASE_PROFILE="${PARTS[0]}"
    MODIFIERS=("${PARTS[@]:1}")
    
    # Validate base profile
    if [[ ! " ${VALID_BASES[@]} " =~ " ${BASE_PROFILE} " ]]; then
        echo "❌ Error: Invalid base profile '$BASE_PROFILE'"
        echo "Valid bases: ${VALID_BASES[*]}"
        exit 1
    fi
    
    # Validate modifiers and reject duplicates. Repeating a modifier used to
    # append the same governance amendment twice.
    local seen_modifiers=" "
    for modifier in "${MODIFIERS[@]}"; do
        if [[ ! " ${VALID_MODIFIERS[@]} " =~ " ${modifier} " ]]; then
            echo "❌ Error: Invalid modifier '$modifier'"
            echo "Valid modifiers: ${VALID_MODIFIERS[*]}"
            exit 1
        fi
        if [[ "$seen_modifiers" == *" $modifier "* ]]; then
            echo "❌ Error: Duplicate modifier '$modifier' in '$composition'"
            exit 1
        fi
        seen_modifiers="$seen_modifiers$modifier "
    done
}

# List all available profiles
list_profiles() {
    echo "📦 Available Base Profiles:"
    for profile in "${VALID_BASES[@]}"; do
        if [ -f "$FRAMEWORK_SOURCE/defaults/profiles/base/$profile/README.md" ]; then
            desc=$(grep "^description:" "$FRAMEWORK_SOURCE/defaults/profiles/base/$profile/README.md" | cut -d: -f2- | xargs)
            printf "  %-12s %s\n" "$profile" "$desc"
        fi
    done
    
    echo ""
    echo "🔧 Available Modifiers:"
    for modifier in "${VALID_MODIFIERS[@]}"; do
        if [ -f "$FRAMEWORK_SOURCE/defaults/profiles/modifiers/$modifier/README.md" ]; then
            desc=$(grep "^description:" "$FRAMEWORK_SOURCE/defaults/profiles/modifiers/$modifier/README.md" | cut -d: -f2- | xargs)
            printf "  +%-11s %s\n" "$modifier" "$desc"
        fi
    done
    
    echo ""
    echo "Example compositions:"
    echo "  setup.sh --profile web+devsecops"
    echo "  setup.sh --profile api+mlops"
    echo "  setup.sh --profile full-stack+devsecops+devops"
}

# Interactive menu for profile selection
interactive_menu() {
    if command -v whiptail &> /dev/null; then
        # Use whiptail for TUI
        BASE_PROFILE=$(whiptail --title "Select Base Profile" --menu "Choose your project type:" 20 70 7 \
            "general" "Generic software project (default)" \
            "web" "Web application (React, Vue, Next.js)" \
            "mobile" "Mobile app (iOS, Android, React Native)" \
            "api" "Backend API service (REST, GraphQL)" \
            "cli" "Command-line tool" \
            "full-stack" "Web + API combined" \
            "monorepo" "Multi-package monorepo (apps + packages)" \
            3>&1 1>&2 2>&3)
        
        if [ $? -ne 0 ]; then
            echo "Installation cancelled."
            exit 0
        fi
        
        # Select modifiers (checkbox)
        MODIFIERS_STR=$(whiptail --title "Select Modifiers (Optional)" --checklist \
            "Choose methodologies to add:" 15 70 3 \
            "devsecops" "Security-first workflows (threat modeling, security checklists)" OFF \
            "mlops" "ML model governance (experiment tracking, data versioning)" OFF \
            "devops" "Advanced CI/CD (pipeline design, infrastructure as code)" OFF \
            3>&1 1>&2 2>&3)
        
        # Parse checkbox output (whiptail returns quoted strings)
        MODIFIERS=()
        for mod in $MODIFIERS_STR; do
            MODIFIERS+=("${mod//\"/}")  # Remove quotes
        done
    else
        # Fallback: simple prompts
        echo "📦 Base Profiles:"
        echo "  1) general   - Generic software project"
        echo "  2) web       - Web application (React, Vue, Next.js)"
        echo "  3) mobile    - Mobile app (iOS, Android)"
        echo "  4) api       - Backend API service"
        echo "  5) cli       - Command-line tool"
        echo "  6) full-stack - Web + API combined"
        echo "  7) monorepo   - Multi-package monorepo (apps + packages)"
        read -p "Select base profile (1-7): " base_choice
        
        case $base_choice in
            1) BASE_PROFILE="general" ;;
            2) BASE_PROFILE="web" ;;
            3) BASE_PROFILE="mobile" ;;
            4) BASE_PROFILE="api" ;;
            5) BASE_PROFILE="cli" ;;
            6) BASE_PROFILE="full-stack" ;;
            7) BASE_PROFILE="monorepo" ;;
            *) echo "Invalid choice. Using 'general'"; BASE_PROFILE="general" ;;
        esac
        
        echo ""
        echo "🔧 Modifiers (optional, comma-separated):"
        echo "  devsecops, mlops, devops"
        read -p "Enter modifiers (or press Enter to skip): " mod_input
        
        if [ -n "$mod_input" ]; then
            IFS=',' read -ra MODIFIERS <<< "$mod_input"
            # Trim whitespace
            for i in "${!MODIFIERS[@]}"; do
                MODIFIERS[$i]=$(echo "${MODIFIERS[$i]}" | xargs)
            done
        else
            MODIFIERS=()
        fi
    fi
}

# Show preview of what will be installed
show_preview() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Profile Composition: $BASE_PROFILE"
    if [ ${#MODIFIERS[@]} -gt 0 ]; then
        echo "   Modifiers: +${MODIFIERS[*]}"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Will install in current directory:"
    echo "  📁 .sdd/templates/      (base + profile templates)"
    echo "  📁 .sdd/memory/         (project memory)"
    echo "  📁 .sdd/memory/rules/   (workflow rules)"
    echo "  📁 skills/              (canonical agent skills at root)"
    if [ "$INSTALL_AGENT_FILES" = true ]; then
        echo "  🧭 AGENTS.md / CLAUDE.md / GEMINI.md / .gemini/GEMINI.md / .github/copilot-instructions.md"
    fi
    echo ""
    
    read -p "Proceed with installation? [Y/n] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]] && [ -n "$REPLY" ]; then
        echo "Installation cancelled."
        exit 0
    fi
}

# Install base framework files
install_base_files() {
    echo "📦 Installing base framework..."
    
    # Migration check: migrate old .sdd/skills/ to root skills/
    if [[ -d "$TARGET_DIR/skills" ]]; then
        echo "🔄 Migrating existing .sdd/skills/ to root skills/ directory..."
        mkdir -p "$PROJECT_ROOT/skills"
        cp -R "$TARGET_DIR/skills/"* "$PROJECT_ROOT/skills/" 2>/dev/null || true
        rm -rf "$TARGET_DIR/skills"
    fi
    
    # Create directory structure
    mkdir -p "$TARGET_DIR/specs/active" "$TARGET_DIR/specs/archive" "$TARGET_DIR/specs/backlog"
    mkdir -p "$TARGET_DIR/memory/rules" "$TARGET_DIR/memory/current-state" "$TARGET_DIR/memory/completed-tasks"
    mkdir -p "$TARGET_DIR/memory/governance" "$TARGET_DIR/memory/archive"
    mkdir -p "$TARGET_DIR/evidence" "$TARGET_DIR/reports" "$TARGET_DIR/hooks"
    mkdir -p "$TARGET_DIR/templates"
    mkdir -p "$PROJECT_ROOT/skills"
    
    # Layer 1: Base templates and memory
    echo "  1/3 Copying base framework files..."
    local copy_mode=""
    [[ "$UPGRADE_MODE" == true ]] && copy_mode="--ignore-existing"
    rsync -a $copy_mode "$FRAMEWORK_SOURCE/defaults/templates/" "$TARGET_DIR/templates/" 2>/dev/null || true
    rsync -a $copy_mode \
        --exclude "constitutional-framework.md" \
        --exclude "glossary.md" \
        "$FRAMEWORK_SOURCE/defaults/memory/" "$TARGET_DIR/memory/" 2>/dev/null || true
    rsync -a $copy_mode "$FRAMEWORK_SOURCE/defaults/skills/" "$PROJECT_ROOT/skills/" 2>/dev/null || true
    
    # Copy scripts to .sdd/scripts for self-containment
    echo "      Copying framework scripts to .sdd/scripts..."
    mkdir -p "$TARGET_DIR/scripts"
    rsync -a "$FRAMEWORK_SOURCE/scripts/" "$TARGET_DIR/scripts/" 2>/dev/null || true
    chmod +x "$TARGET_DIR/scripts"/*.sh 2>/dev/null || true

    # Seed per-checkout machine state. This file is gitignored by the framework
    # because it records private, in-flight work and differs per developer.
    if [[ ! -f "$TARGET_DIR/state" ]]; then
        printf 'schema_version=1\n' > "$TARGET_DIR/state"
    fi
    
    # Copy AGENT_ONBOARDING
    if [[ "$UPGRADE_MODE" != true || ! -f "$TARGET_DIR/AGENT_ONBOARDING.md" ]]; then
        cp "$FRAMEWORK_SOURCE/AGENT_ONBOARDING.md" "$TARGET_DIR/" 2>/dev/null || true
    fi
    
    # Copy top-level governance files
    [[ -f "$TARGET_DIR/constitution.md" ]] || cp "$FRAMEWORK_SOURCE/defaults/memory/constitutional-framework.md" "$TARGET_DIR/constitution.md"
    [[ -f "$TARGET_DIR/glossary.md" ]] || cp "$FRAMEWORK_SOURCE/defaults/memory/glossary.md" "$TARGET_DIR/glossary.md"
    [[ -f "$TARGET_DIR/framework.json" ]] || cp "$FRAMEWORK_SOURCE/defaults/framework.json" "$TARGET_DIR/framework.json"

    # Record the selected composition without making scripts parse prose.
    if [[ -f "$TARGET_DIR/framework.json" && "$UPGRADE_MODE" != true ]]; then
        local composition="$BASE_PROFILE"
        for modifier in "${MODIFIERS[@]}"; do composition="$composition+$modifier"; done
        sed -e "s/\"profile\": \"general\"/\"profile\": \"$composition\"/" \
            "$TARGET_DIR/framework.json" > "$TARGET_DIR/framework.json.tmp"
        mv "$TARGET_DIR/framework.json.tmp" "$TARGET_DIR/framework.json"
    fi
}

# Install root-level agent entrypoints for common coding agents
install_agent_entrypoints() {
    if [ "$INSTALL_AGENT_FILES" != true ]; then
        echo "🧭 Skipping agent entrypoints (--no-agent-files)"
        return
    fi

    local entries=(
        "AGENTS.md"
        "CLAUDE.md"
        "GEMINI.md"
        ".gemini/GEMINI.md"
        ".github/copilot-instructions.md"
    )

    echo "🧭 Installing agent entrypoints..."
    for rel_path in "${entries[@]}"; do
        local src="$FRAMEWORK_SOURCE/defaults/agent-entrypoints/$rel_path"
        local dst="$PROJECT_ROOT/$rel_path"

        if [[ ! -f "$src" ]]; then
            continue
        fi

        mkdir -p "$(dirname "$dst")"
        if [[ -f "$dst" ]]; then
            echo "      KEEP $rel_path (already exists)"
        else
            cp "$src" "$dst"
            echo "      ADD  $rel_path"
        fi
    done
}

# Install git pre-commit hook for automated quality gates
install_git_hooks() {
    local hook_file
    hook_file=$(git rev-parse --git-path hooks/pre-commit 2>/dev/null) || return 0
    if git rev-parse --git-dir >/dev/null 2>&1; then
        if [[ -f "$hook_file" ]]; then
            echo "🛡️  KEEP existing pre-commit hook unchanged."
            echo "   Optional SDD gate: $TARGET_DIR/hooks/pre-commit"
            write_sdd_precommit "$TARGET_DIR/hooks/pre-commit"
            return
        fi
        echo "⚓ Installing git pre-commit hook..."
        mkdir -p "$(dirname "$hook_file")"
        write_sdd_precommit "$hook_file"
    fi
}

write_sdd_precommit() {
    local hook_file="$1"
    cat > "$hook_file" <<'EOF'
#!/usr/bin/env bash
# SDD Pre-commit Quality Gate (observed execution records)
ROOT=$(git rev-parse --show-toplevel) || exit 1
cd "$ROOT" || exit 1
for scripts in .sdd/scripts scripts .sdd-framework/scripts; do
    if [[ -f "$scripts/hook-run.sh" ]]; then
        exec bash "$scripts/hook-run.sh"
    fi
done
printf '%s\n' 'SDD hook runner missing. Restore framework scripts before committing.' >&2
exit 1
EOF
    chmod +x "$hook_file"
}

# Apply base profile overlay
apply_base_profile() {
    if [ "$BASE_PROFILE" = "full-stack" ]; then
        echo "  2/3 Applying base profile: full-stack (web + api + full-stack)"
        rsync -a --exclude "README.md" "$FRAMEWORK_SOURCE/defaults/profiles/base/web/" "$TARGET_DIR/" 2>/dev/null || true
        rsync -a --exclude "README.md" "$FRAMEWORK_SOURCE/defaults/profiles/base/api/" "$TARGET_DIR/" 2>/dev/null || true
        rsync -a "$FRAMEWORK_SOURCE/defaults/profiles/base/full-stack/" "$TARGET_DIR/" 2>/dev/null || true
        return
    fi

    if [ -d "$FRAMEWORK_SOURCE/defaults/profiles/base/$BASE_PROFILE" ]; then
        echo "  2/3 Applying base profile: $BASE_PROFILE"
        rsync -a "$FRAMEWORK_SOURCE/defaults/profiles/base/$BASE_PROFILE/" "$TARGET_DIR/" 2>/dev/null || true
    fi
}

# Append a markdown fragment once, using its first level-2 heading as a stable
# marker. Setup is allowed to run repeatedly on an existing project; composition
# must therefore be idempotent rather than duplicating governance text.
append_markdown_once() {
    local target="$1" fragment="$2"
    local marker
    marker=$(grep -m1 '^## ' "$fragment" 2>/dev/null || true)

    if [[ -n "$marker" ]] && grep -Fqx "$marker" "$target" 2>/dev/null; then
        echo "        SKIP $(basename "$fragment") (already applied)"
        return 0
    fi

    {
        echo ""
        echo "---"
        echo ""
        cat "$fragment"
    } >> "$target"
}

# Apply modifier overlays
apply_modifiers() {
    if [ ${#MODIFIERS[@]} -gt 0 ]; then
        echo "  3/3 Applying modifiers:"
        for modifier in "${MODIFIERS[@]}"; do
            if [ -d "$FRAMEWORK_SOURCE/defaults/profiles/modifiers/$modifier" ]; then
                echo "      +$modifier"
                
                # Overlay files
                rsync -a "$FRAMEWORK_SOURCE/defaults/profiles/modifiers/$modifier/" "$TARGET_DIR/" 2>/dev/null || true
                
                # Append constitutional amendment to the canonical constitution.
                # Do not append to memory/constitutional-framework.md: agents are
                # instructed to read .sdd/constitution.md, and splitting amendments
                # from the canonical file made composed governance ineffective.
                if [ -f "$FRAMEWORK_SOURCE/defaults/profiles/modifiers/$modifier/memory/constitutional-amendment.md" ]; then
                    append_markdown_once \
                        "$TARGET_DIR/constitution.md" \
                        "$FRAMEWORK_SOURCE/defaults/profiles/modifiers/$modifier/memory/constitutional-amendment.md"
                fi

                # Append before-task extensions idempotently.
                if [ -f "$FRAMEWORK_SOURCE/defaults/profiles/modifiers/$modifier/memory/rules/before-task_extends.md" ]; then
                    append_markdown_once \
                        "$TARGET_DIR/memory/rules/before-task.md" \
                        "$FRAMEWORK_SOURCE/defaults/profiles/modifiers/$modifier/memory/rules/before-task_extends.md"
                fi
            fi
        done
    fi
}

# Generate profile metadata
generate_metadata() {
    local composition="$BASE_PROFILE"
    if [ ${#MODIFIERS[@]} -gt 0 ]; then
        composition="$BASE_PROFILE+${MODIFIERS[*]}"
        composition="${composition// /+}"  # Replace spaces with +
    fi
    
    echo "$composition" > "$TARGET_DIR/.profile"
    echo ""
    echo "✅ SDD Framework initialized successfully!"
    echo "   Profile: $composition"
    echo ""
    echo "📖 Next steps:"
    echo "   1. Read .sdd/AGENT_ONBOARDING.md for workflow guidance"
    echo "   2. Start with .sdd/templates/ for spec creation"
    echo "   3. Optionally sync skills: bash scripts/skills.sh sync"
}

# ==============================================================================
# MAIN
# ==============================================================================

# Parse arguments
PROFILE_ARG=""
WITH_EXAMPLES=false
AUTO_YES=false
INSTALL_AGENT_FILES=true
UPGRADE_MODE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --profile)
            PROFILE_ARG="$2"
            shift 2
            ;;
        --with-examples)
            WITH_EXAMPLES=true
            shift 1
            ;;
        --yes|-y)
            AUTO_YES=true
            shift 1
            ;;
        --no-agent-files)
            INSTALL_AGENT_FILES=false
            shift 1
            ;;
        --upgrade)
            UPGRADE_MODE=true
            AUTO_YES=true
            shift 1
            ;;
        --list-profiles|--list)
            list_profiles
            exit 0
            ;;
        --help|-h)
            echo "SDD Framework Setup"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --profile COMPOSITION    Use specific profile composition"
            echo "                           (e.g., web+devsecops, api+mlops)"
            echo "  --with-examples          Copy example specs into .sdd/specs/examples"
            echo "  --yes                    Skip confirmation prompts"
            echo "  --no-agent-files         Skip creating root agent entrypoint files"
            echo "  --upgrade                Conservatively refresh scripts and add missing assets"
            echo "  --list-profiles          Show all available profiles"
            echo "  --help                   Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Interactive menu"
            echo "  $0 --profile web+devsecops           # Web with security"
            echo "  $0 --profile api+mlops               # API with ML governance"
            echo "  $0 --profile general --with-examples # Include example specs"
            echo "  $0 --profile general --yes           # No prompts"
            echo "  $0 --profile general --no-agent-files"
            echo "  $0 --list-profiles                   # Show all profiles"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Run '$0 --help' for usage information"
            exit 1
            ;;
    esac
done

# Determine profile composition
if [ -n "$PROFILE_ARG" ]; then
    parse_profile "$PROFILE_ARG"
else
    if [ "$AUTO_YES" = true ]; then
        BASE_PROFILE="general"
        MODIFIERS=()
    else
        interactive_menu
    fi
fi

# Show preview and confirm
if [ "$AUTO_YES" = true ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Profile Composition: $BASE_PROFILE"
    if [ ${#MODIFIERS[@]} -gt 0 ]; then
        echo "   Modifiers: +${MODIFIERS[*]}"
    fi
    if [ "$WITH_EXAMPLES" = true ]; then
        echo "   Examples: enabled"
    fi
    if [ "$INSTALL_AGENT_FILES" = false ]; then
        echo "   Agent files: disabled"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
else
    show_preview
fi

# Install files
install_base_files
install_agent_entrypoints
install_git_hooks
if [[ "$UPGRADE_MODE" != true ]]; then
    apply_base_profile
    apply_modifiers
fi

if [ "$WITH_EXAMPLES" = true ]; then
    echo "📄 Copying example specs..."
    mkdir -p "$TARGET_DIR/specs/examples"
    rsync -a "$FRAMEWORK_SOURCE/defaults/specs-example/" "$TARGET_DIR/specs/examples/" 2>/dev/null || true
fi

if [[ "$UPGRADE_MODE" == true ]]; then
    upgrade_stamp=$(date -u +%Y%m%dT%H%M%SZ)
    upgrade_dir="$TARGET_DIR/memory/archive/framework-upgrades/$upgrade_stamp"
    mkdir -p "$upgrade_dir"
    {
        echo "# Framework Upgrade $upgrade_stamp"
        echo
        echo "- Scripts: refreshed from framework source"
        echo "- Missing templates/rules/topology: added"
        echo "- Constitution, memory, specs, skills, agent entrypoints, and hooks: preserved when present"
        echo "- Profile: preserved from existing .sdd/.profile"
        echo "- Conflicts: semantic framework assets already present require project review"
    } > "$upgrade_dir/manifest.md"
    echo "✅ Conservative framework upgrade complete."
    echo "   Manifest: $upgrade_dir/manifest.md"
    bash "$TARGET_DIR/scripts/doctor.sh"
else
    generate_metadata
fi
