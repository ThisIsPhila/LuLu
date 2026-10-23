#!/usr/bin/env bash
# Common functions for SDD Framework scripts

# Get repository root
get_repo_root() {
    git rev-parse --show-toplevel 2>/dev/null || echo "."
}

# Get current branch
get_current_branch() {
    git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"
}

# Check if a file exists and report
check_file() {
    local file="$1"
    local description="$2"
    if [[ -f "$file" ]]; then
        echo "  ✓ $description"
        return 0
    else
        echo "  ✗ $description"
        return 1
    fi
}

# Check if a directory exists and has files
check_dir() {
    local dir="$1"
    local description="$2"
    if [[ -d "$dir" ]] && [[ -n "$(ls -A "$dir" 2>/dev/null)" ]]; then
        echo "  ✓ $description"
        return 0
    else
        echo "  ✗ $description"
        return 1
    fi
}

# Count files matching pattern in directory
count_files() {
    local dir="$1"
    local pattern="$2"
    find "$dir" -name "$pattern" -type f 2>/dev/null | wc -l | xargs
}

# Extract YAML frontmatter value from markdown file
get_yaml_value() {
    local file="$1"
    local key="$2"
    grep "^${key}:" "$file" 2>/dev/null | cut -d: -f2- | xargs
}
