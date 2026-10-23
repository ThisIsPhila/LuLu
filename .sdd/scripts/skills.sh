#!/usr/bin/env bash
# SDD Skills Management CLI
# Manage, sync, validate, create, and fetch agent skills.

set -e

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
SKILLS_DIR="$REPO_ROOT/skills"

usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  list                  List all available local skills"
    echo "  sync                  Sync local skills to agent directories"
    echo "  create <name>         Scaffold a new skill directory under skills/"
    echo "  validate              Validate structure and frontmatter of local skills"
    echo "  pack <validate|install> <folder> [--update]   Manage an SDD community skill pack (optional Node)"
    echo "  add <source>          Download and add a skill from a remote repository"
    echo ""
    echo "Options for sync:"
    echo "  --target <all|claude|copilot|gemini|codex>   Specify target agent (default: all)"
    echo "  --dry-run                                    Preview changes without copying files"
    echo ""
    echo "Options for add:"
    echo "  --skill <name>                               Download a specific skill from the source"
    echo ""
}

cmd_list() {
    if [[ ! -d "$SKILLS_DIR" ]]; then
        echo "❌ Local skills directory not found: skills/"
        exit 1
    fi
    local found=0
    for d in "$SKILLS_DIR"/*; do
        if [[ -d "$d" && -f "$d/SKILL.md" ]]; then
            # Extract name and description from YAML frontmatter
            local name=$(sed -n '/^---$/,/^---$/p' "$d/SKILL.md" | grep "^name:" | head -n1 | cut -d: -f2- | xargs 2>/dev/null || true)
            local desc=$(sed -n '/^---$/,/^---$/p' "$d/SKILL.md" | grep "^description:" | head -n1 | cut -d: -f2- | xargs 2>/dev/null || true)
            if [[ -z "$name" ]]; then
                name=$(basename "$d")
            fi
            printf "⭐️ \033[1;36m%-20s\033[0m - %s\n" "$name" "$desc"
            found=$((found+1))
        fi
    done
    if [[ $found -eq 0 ]]; then
        echo "No skills found in skills/"
    fi
}

resolve_target_dir() {
    case "$1" in
        codex) echo "$REPO_ROOT/.agents/skills" ;;
        claude) echo "$REPO_ROOT/.claude/skills" ;;
        copilot) echo "$REPO_ROOT/.github/skills" ;;
        gemini) echo "$REPO_ROOT/.gemini/skills" ;;
        *) return 1 ;;
    esac
}

sync_one() {
    local target_name="$1"
    local target_dir
    target_dir=$(resolve_target_dir "$target_name")

    if [[ "$DRY_RUN" == true ]]; then
        echo "DRY   rsync -a '$SKILLS_DIR/' '$target_dir/'"
        return
    fi

    mkdir -p "$target_dir"
    rsync -a "$SKILLS_DIR/" "$target_dir/"
    echo "SYNC  $target_name -> ${target_dir#$REPO_ROOT/}"
}

cmd_sync() {
    local target="all"
    local dry_run=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --target)
                target="$2"
                shift 2
                ;;
            --dry-run|-n)
                dry_run=true
                shift
                ;;
            *)
                # Support positional target parameter
                target="$1"
                shift
                ;;
        esac
    done

    DRY_RUN=$dry_run

    if [[ ! -d "$SKILLS_DIR" ]]; then
        echo "❌ Local skills directory not found: skills/"
        exit 1
    fi

    if [[ "$target" == "all" ]]; then
        sync_one codex
        sync_one claude
        sync_one copilot
        sync_one gemini
    else
        case "$target" in
            codex|claude|copilot|gemini)
                sync_one "$target"
                ;;
            *)
                echo "❌ Invalid target: $target. Choose from: all, codex, claude, copilot, gemini"
                exit 1
                ;;
        esac
    fi
}

cmd_create() {
    local name="$1"
    if [[ -z "$name" ]]; then
        echo "❌ Usage: $0 create <skill-name>"
        exit 1
    fi

    if [[ ! "$name" =~ ^[a-z0-9-]+$ ]]; then
        echo "❌ Error: Skill name '$name' must be kebab-case (lowercase, numbers, hyphens only)."
        exit 1
    fi

    local target_dir="$SKILLS_DIR/$name"
    if [[ -d "$target_dir" ]]; then
        echo "❌ Error: Skill '$name' already exists at skills/$name."
        exit 1
    fi

    mkdir -p "$target_dir"
    local first_char=$(echo "${name:0:1}" | tr '[:lower:]' '[:upper:]')
    local cap_name="${first_char}${name:1}"
    cat > "$target_dir/SKILL.md" <<EOF
---
name: $name
description: A description of what the $name skill does and when the agent should use it.
---

# $cap_name Skill

## When to use this skill

Describe when the agent should trigger/use this skill.

## Instructions

Provide step-by-step instructions for the agent to follow.
EOF

    echo "✅ Created skill '$name' at skills/$name containing SKILL.md."
}

cmd_validate() {
    if [[ ! -d "$SKILLS_DIR" ]]; then
        echo "❌ Local skills directory not found: skills/"
        exit 1
    fi
    local errors=0
    for d in "$SKILLS_DIR"/*; do
        if [[ -d "$d" ]]; then
            local folder_name=$(basename "$d")
            if [[ ! "$folder_name" =~ ^[a-z0-9-]+$ ]]; then
                echo "❌ FAIL: Folder '$folder_name' is not kebab-case."
                errors=$((errors+1))
                continue
            fi
            if [[ ! -f "$d/SKILL.md" ]]; then
                echo "❌ FAIL: Skill '$folder_name' is missing SKILL.md."
                errors=$((errors+1))
                continue
            fi
            local file="$d/SKILL.md"
            if ! grep -q "^name:" "$file"; then
                echo "❌ FAIL: Skill '$folder_name' is missing 'name' in frontmatter."
                errors=$((errors+1))
            fi
            if ! grep -q "^description:" "$file"; then
                echo "❌ FAIL: Skill '$folder_name' is missing 'description' in frontmatter."
                errors=$((errors+1))
            fi
            local fm_name=$(sed -n '/^---$/,/^---$/p' "$file" | grep "^name:" | head -n1 | cut -d: -f2- | xargs 2>/dev/null || true)
            if [[ "$fm_name" != "$folder_name" ]]; then
                echo "❌ FAIL: Skill '$folder_name' has mismatched name in frontmatter: '$fm_name'."
                errors=$((errors+1))
            fi
        fi
    done

    if [[ $errors -eq 0 ]]; then
        echo "✅ Validation passed. All skills in skills/ are valid."
        exit 0
    else
        echo "❌ Validation failed with $errors error(s)."
        exit 1
    fi
}

cmd_add() {
    local source="${1:-}"
    shift
    local target_skill=""

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --skill)
                target_skill="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    if [[ -z "$source" ]]; then
        echo "❌ Usage: $0 add <owner/repo> [--skill <name>]"
        exit 1
    fi

    if [[ -n "$target_skill" && ! "$target_skill" =~ ^[a-z0-9-]+$ ]]; then echo "Invalid skill name"; exit 1; fi

    local repo_url="$source"
    if [[ ! "$source" =~ ^(http|https|git@) ]]; then
        repo_url="https://github.com/${source}.git"
    fi

    echo "📥 Cloning $repo_url to temporary folder..."
    local temp_dir
    temp_dir=$(mktemp -d)

    if ! git clone --depth 1 "$repo_url" "$temp_dir" >/dev/null 2>&1; then
        echo "❌ Error: Failed to clone repository at $repo_url"
        rm -rf "$temp_dir"
        exit 1
    fi

    local src_skills_dir="$temp_dir/skills"
    if [[ ! -d "$src_skills_dir" ]]; then
        src_skills_dir="$temp_dir"
    fi

    mkdir -p "$SKILLS_DIR"

    if [[ -n "$target_skill" ]]; then
        if [[ -d "$src_skills_dir/$target_skill" ]]; then
            cp -R "$src_skills_dir/$target_skill" "$SKILLS_DIR/"
            echo "✅ Successfully added skill '$target_skill' from $source to skills/."
        else
            echo "❌ Error: Skill '$target_skill' not found in repository."
            rm -rf "$temp_dir"
            exit 1
        fi
    else
        local count=0
        for d in "$src_skills_dir"/*; do
            if [[ -d "$d" && -f "$d/SKILL.md" ]]; then
                local sname=$(basename "$d")
                cp -R "$d" "$SKILLS_DIR/"
                echo "✅ Added skill '$sname'."
                count=$((count+1))
            fi
        done
        if [[ $count -eq 0 ]]; then
            echo "❌ Error: No valid skills containing SKILL.md found in $source."
            rm -rf "$temp_dir"
            exit 1
        fi
        echo "✅ Added $count skill(s) from $source."
    fi

    rm -rf "$temp_dir"
}

if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi

COMMAND="$1"
shift

case "$COMMAND" in
    list) cmd_list ;;
    sync) cmd_sync "$@" ;;
    create) cmd_create "$@" ;;
    validate) cmd_validate ;;
    add) cmd_add "$@" ;;
    pack) command -v node >/dev/null 2>&1 || { echo "Skill packs require optional Node.js"; exit 1; }; node "$(dirname "${BASH_SOURCE[0]}")/skill-pack.cjs" "$@" ;;
    help|-h|--help) usage ;;
    *)
        echo "❌ Unknown command: $COMMAND"
        usage
        exit 1
        ;;
esac
