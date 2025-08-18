#!/bin/bash
# Validates that the template repository is properly set up

echo "Validating template repository setup..."

required_files=(
    "CLAUDE.md"
    "claude-swarm.yaml"
    "PROJECT_INIT.md"
    "setup.sh"
    "init-project.sh"
    "README.md"
    ".claude/config.yaml"
)

missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo "✅ All required files present!"
    exit 0
else
    echo "❌ Missing files:"
    printf '%s\n' "${missing_files[@]}"
    exit 1
fi
