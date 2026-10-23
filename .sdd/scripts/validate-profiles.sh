#!/usr/bin/env bash
# Validate profile structure and content

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

REPO_ROOT=$(get_repo_root)
PROFILES_DIR="$REPO_ROOT/defaults/profiles"

echo "🔍 Validating SDD Framework profiles..."
echo ""

ERRORS=0

# Validate base profiles
echo "📦 Base Profiles:"
for profile_dir in "$PROFILES_DIR/base"/*; do
    profile_name=$(basename "$profile_dir")
    
    # Check README.md exists
    if ! check_file "$profile_dir/README.md" "$profile_name/README.md"; then
        ERRORS=$((ERRORS + 1))
        continue
    fi
    
    # Check frontmatter has required fields
    readme="$profile_dir/README.md"
    name=$(get_yaml_value "$readme" "name")
    type=$(get_yaml_value "$readme" "type")
    description=$(get_yaml_value "$readme" "description")
    
    if [[ -z "$name" ]] || [[ -z "$type" ]] || [[ -z "$description" ]]; then
        echo "    ✗ $profile_name: Missing frontmatter fields"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check type is 'base'
    if [[ "$type" != "base" ]]; then
        echo "    ✗ $profile_name: Type must be 'base', got '$type'"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# Validate modifiers
echo "🔧 Modifiers:"
for modifier_dir in "$PROFILES_DIR/modifiers"/*; do
    modifier_name=$(basename "$modifier_dir")
    
    # Check README.md exists
    if ! check_file "$modifier_dir/README.md" "$modifier_name/README.md"; then
        ERRORS=$((ERRORS + 1))
        continue
    fi
    
    # Check frontmatter
    readme="$modifier_dir/README.md"
    name=$(get_yaml_value "$readme" "name")
    type=$(get_yaml_value "$readme" "type")
    
    if [[ -z "$name" ]] || [[ -z "$type" ]]; then
        echo "    ✗ $modifier_name: Missing frontmatter fields"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check type is 'modifier'
    if [[ "$type" != "modifier" ]]; then
        echo "    ✗ $modifier_name: Type must be 'modifier', got '$type'"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check for constitutional amendment (recommended)
    if [[ ! -f "$modifier_dir/memory/constitutional-amendment.md" ]]; then
        echo "    ⚠️  $modifier_name: No constitutional-amendment.md (recommended)"
    fi
done

echo ""

# Validate templates have approval checkpoints
echo "📝 Templates (checking for approval checkpoints):"
template_count=0
missing_checkpoints=0

for profile_dir in "$PROFILES_DIR"/base/* "$PROFILES_DIR"/modifiers/*; do
    if [[ -d "$profile_dir/templates" ]]; then
        for template in "$profile_dir/templates"/*.md; do
            if [[ -f "$template" ]]; then
                template_count=$((template_count + 1))
                if ! grep -q "Approval Checkpoint" "$template"; then
                    echo "  ✗ $(basename "$template"): Missing approval checkpoint"
                    missing_checkpoints=$((missing_checkpoints + 1))
                    ERRORS=$((ERRORS + 1))
                fi
            fi
        done
    fi
done

if [[ $missing_checkpoints -eq 0 ]]; then
    echo "  ✓ All $template_count templates have approval checkpoints"
fi

echo ""
echo "🧭 Monorepo Coordination Scaffolding:"
MONOREPO_DIR="$PROFILES_DIR/base/monorepo"
MONOREPO_FILES=(
    "$MONOREPO_DIR/coordination/README.md"
    "$MONOREPO_DIR/coordination/apps/README.md"
    "$MONOREPO_DIR/coordination/apps/component-coordination-template.md"
    "$MONOREPO_DIR/coordination/services/README.md"
    "$MONOREPO_DIR/coordination/progress/current-phase-status.md"
    "$MONOREPO_DIR/coordination/progress/weekly-updates.md"
    "$MONOREPO_DIR/coordination/progress/sdd-compliance-latest.md"
    "$MONOREPO_DIR/coordination/progress/sdd-compliance-history.md"
    "$MONOREPO_DIR/coordination/blockers.md"
    "$MONOREPO_DIR/coordination/breaking-changes.md"
    "$MONOREPO_DIR/coordination/phase-start-template.md"
    "$MONOREPO_DIR/coordination/phase-complete-template.md"
    "$MONOREPO_DIR/memory/rules/monorepo-governance.md"
    "$MONOREPO_DIR/workflows/automations/sdd-compliance-audit.md"
    "$MONOREPO_DIR/workflows/automations/weekly-coordination-rollup.md"
)

for file in "${MONOREPO_FILES[@]}"; do
    rel_path="${file#$MONOREPO_DIR/}"
    if ! check_file "$file" "monorepo/$rel_path"; then
        ERRORS=$((ERRORS + 1))
    fi
done

if ! check_file "$REPO_ROOT/scripts/audit-monorepo.sh" "scripts/audit-monorepo.sh"; then
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $ERRORS -eq 0 ]]; then
    echo "✅ Validation passed!"
    exit 0
else
    echo "❌ Validation failed with $ERRORS errors"
    exit 1
fi
