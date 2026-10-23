# Spec Naming Convention

## Rule
All spec folders under `.sdd/specs/active/`, `.sdd/specs/archive/`, and `.sdd/specs/backlog/` must follow the naming convention defined here.

**Default convention:** `phase-###-short-slug`

**Examples:**
- `phase-001-auth`
- `phase-010-mcp-setup`

## Regex (Used by Tooling)
Regex: ^phase-[0-9]{3}-[a-z0-9-]+$

## Changing the Convention
If you want a different naming style (e.g., `feature-xyz`):

1. Update the **Regex** line above.
2. Update the examples to match the new style.
3. Rename any existing spec folders.
4. Agents must follow this file as the single source of truth.

**Example alternative:**
Regex: ^feature-[a-z0-9-]+$
