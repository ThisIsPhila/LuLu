#!/usr/bin/env bash
# Sync canonical SDD skills from skills/ into agent-specific skill folders
# Deprecated: Use scripts/skills.sh sync instead.

echo "⚠️  Warning: scripts/sync-skills.sh is deprecated. Please use 'scripts/skills.sh sync' instead." >&2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/skills.sh" sync "$@"
