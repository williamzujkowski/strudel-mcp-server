#!/bin/bash
# complete-setup.sh - Complete Template Repository Setup Script
# This script creates all necessary files and directories for the template repository generator

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Print banner
echo -e "${CYAN}${BOLD}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Template Repository Generator - Complete Setup         ║"
echo "║        Powered by Claude AI & williamzujkowski/standards   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}Starting complete setup...${NC}\n"

# Check if we should use existing files
USE_EXISTING=false
if [ -f "claude-md-template.md" ] && [ -f "main-setup-script.sh" ]; then
    echo -e "${YELLOW}Detected existing template files in current directory.${NC}"
    read -p "Use existing files instead of creating new ones? (y/N): " use_existing
    if [[ "$use_existing" =~ ^[Yy]$ ]]; then
        USE_EXISTING=true
        echo -e "${GREEN}✓${NC} Using existing files..."
    fi
fi

# Create directory structure
echo -e "${GREEN}✓${NC} Creating directory structure..."
mkdir -p .claude/{context,prompts,workflows,templates}
mkdir -p .github/workflows
mkdir -p scripts
mkdir -p docs
mkdir -p examples

# Function to copy or create files
copy_or_create() {
    local source_file=$1
    local target_file=$2
    local create_function=$3
    
    if [ "$USE_EXISTING" = true ] && [ -f "$source_file" ]; then
        echo -e "${GREEN}✓${NC} Copying $source_file to $target_file..."
        cp "$source_file" "$target_file"
    else
        echo -e "${GREEN}✓${NC} Creating $target_file..."
        $create_function
    fi
}

# Function to create CLAUDE.md
create_claude_md() {
    cat > CLAUDE.md << 'CLAUDE_END'
# CLAUDE.md - AI Development Interface
> 🚀 **Version 2.0** | Optimized for Claude CLI & claude-swarm | Token-efficient | NIST 800-53r5 Compliant

## 📋 Quick Start

```bash
# Initialize project with Claude CLI
claude init

# Set up claude-swarm for parallel processing
claude-swarm setup --project-type={type} --standards=@williamzujkowski/standards

# Load this context
@load [CLAUDE.md + PROJECT_CONTEXT]
```

## 🎯 Primary Directives

You are an expert software architect implementing @williamzujkowski/standards. When working on this project:

1. **ALWAYS** follow the battle-tested standards from the standards repository
2. **IMPLEMENT** NIST 800-53r5 security controls with @nist annotations
3. **OPTIMIZE** for token efficiency (90% reduction target)
4. **GENERATE** comprehensive but concise code with proper error handling
5. **DOCUMENT** with Knowledge Management Standards patterns
6. **TEST** according to Testing Standards (80%+ coverage minimum)

## 🏗️ Project Context

### Project Information
```yaml
project_name: {PROJECT_NAME}
project_type: {PROJECT_TYPE}  # web|api|cli|library|microservice|data-pipeline
language: {PRIMARY_LANGUAGE}
framework: {FRAMEWORK}
deployment_target: {DEPLOYMENT}  # aws|gcp|azure|kubernetes|docker
compliance_requirements: [NIST, SOC2, GDPR]  # as applicable
```

---

*Remember: This is a living document. Update project-specific sections as your project evolves.*

**Last Updated**: {TIMESTAMP}
**Standards Version**: williamzujkowski/standards@latest
**Claude CLI Version**: 2.0+
CLAUDE_END
}

# Create CLAUDE.md
copy_or_create "claude-md-template.md" "CLAUDE.md" create_claude_md

# Function to create claude-swarm.yaml
create_swarm_yaml() {
    cat > claude-swarm.yaml << 'SWARM_END'
# claude-swarm.yaml - Advanced Parallel AI Processing Configuration
version: "2.0"
name: intelligent-development-swarm

global:
  model: claude-3-opus-20240229
  max_workers: 8
  timeout: 300
  
  standards:
    repository: https://github.com/williamzujkowski/standards
    enforce: strict
    auto_update: true

agents:
  architect:
    role: system-architect
    capabilities:
      - design_patterns
      - security_architecture
    
  developer:
    role: code-generator
    instances: 3
    capabilities:
      - implement_features
      - refactor_code
    
  tester:
    role: quality-assurance
    instances: 2
    capabilities:
      - generate_tests
      - security_testing

workflows:
  feature_development:
    description: "Complete feature development cycle"
    trigger: manual
    stages:
      - design:
          agent: architect
      - implement:
          agent: developer
          parallel: true
      - test:
          agent: tester
          coverage_target: 90
SWARM_END
}

# Create claude-swarm.yaml
copy_or_create "claude-swarm-config.txt" "claude-swarm.yaml" create_swarm_yaml

# Function to create PROJECT_INIT.md
create_project_init() {
    cat > PROJECT_INIT.md << 'INIT_END'
# PROJECT_INIT.md - Universal Project Initialization Prompt

> Copy this prompt to Claude CLI to instantly initialize any project with williamzujkowski/standards

## 🚀 The Ultimate Project Kickstart Prompt

I need you to act as an expert software architect and create a complete project structure following williamzujkowski/standards.

## Project Details
- **Name**: [PROJECT_NAME]
- **Type**: [web|api|cli|library|microservice]
- **Language**: [typescript|python|go|rust|java]
- **Framework**: [react|fastapi|express|gin]

Generate complete project structure with:
1. All necessary directories and files
2. Configuration files
3. Docker setup
4. CI/CD pipelines
5. Testing infrastructure
6. Documentation

Ensure all code follows SOLID principles and includes proper error handling.
INIT_END
}

# Create PROJECT_INIT.md
copy_or_create "project-init-prompt.md" "PROJECT_INIT.md" create_project_init

# Function to create setup.sh
create_setup_sh() {
    cat > setup.sh << 'SETUP_END'
#!/bin/bash
# setup.sh - Main setup script for template repository

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Default values
PROJECT_NAME=""
PROJECT_TYPE=""
LANGUAGE=""
FRAMEWORK=""

# Print banner
print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║        Template Repository Generator with Claude          ║"
    echo "║           Powered by williamzujkowski/standards           ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Get project details
get_project_details() {
    echo -e "${BLUE}Let's set up your new project!${NC}\n"
    
    # Project name
    read -p "Project name: " PROJECT_NAME
    while [[ ! "$PROJECT_NAME" =~ ^[a-z0-9-]+$ ]]; do
        echo -e "${RED}Invalid name. Use lowercase letters, numbers, and hyphens only.${NC}"
        read -p "Project name: " PROJECT_NAME
    done
    
    # Project type
    echo -e "\n${CYAN}Select project type:${NC}"
    echo "1) web      - Full-stack web application"
    echo "2) api      - REST/GraphQL API service"
    echo "3) cli      - Command-line tool"
    echo "4) library  - NPM/PyPI package"
    echo "5) microservice - Microservice"
    read -p "Choice (1-5): " type_choice
    
    case $type_choice in
        1) PROJECT_TYPE="web" ;;
        2) PROJECT_TYPE="api" ;;
        3) PROJECT_TYPE="cli" ;;
        4) PROJECT_TYPE="library" ;;
        5) PROJECT_TYPE="microservice" ;;
        *) PROJECT_TYPE="api" ;;
    esac
    
    # Language
    echo -e "\n${CYAN}Select primary language:${NC}"
    echo "1) typescript - Type-safe JavaScript"
    echo "2) python     - Fast development"
    echo "3) go         - High performance"
    echo "4) rust       - System programming"
    echo "5) java       - Enterprise applications"
    read -p "Choice (1-5): " lang_choice
    
    case $lang_choice in
        1) LANGUAGE="typescript" ;;
        2) LANGUAGE="python" ;;
        3) LANGUAGE="go" ;;
        4) LANGUAGE="rust" ;;
        5) LANGUAGE="java" ;;
        *) LANGUAGE="typescript" ;;
    esac
    
    FRAMEWORK="express"  # Default for now
}

# Create project structure
create_project() {
    echo -e "\n${BLUE}Creating project structure...${NC}"
    
    # Create project directory
    mkdir -p "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    
    # Create directory structure
    mkdir -p .claude/{context,prompts,workflows}
    mkdir -p .github/workflows
    mkdir -p .vscode
    mkdir -p src
    mkdir -p tests
    mkdir -p docs
    mkdir -p scripts
    mkdir -p config
    
    echo -e "${GREEN}✓${NC} Directory structure created"
}

# Copy and customize templates
copy_templates() {
    echo -e "${BLUE}Setting up template files...${NC}"
    
    # Copy CLAUDE.md and replace placeholders
    if [ -f ../CLAUDE.md ]; then
        sed "s/{PROJECT_NAME}/$PROJECT_NAME/g; \
             s/{PROJECT_TYPE}/$PROJECT_TYPE/g; \
             s/{PRIMARY_LANGUAGE}/$LANGUAGE/g; \
             s/{FRAMEWORK}/$FRAMEWORK/g; \
             s/{DEPLOYMENT}/docker/g; \
             s/{TEST_FRAMEWORK}/jest/g; \
             s/{TIMESTAMP}/$(date -Iseconds)/g" \
             ../CLAUDE.md > CLAUDE.md
        echo -e "${GREEN}✓${NC} CLAUDE.md configured"
    fi
}

# Create Claude configuration
create_claude_config() {
    cat > .claude/config.yaml << CONFIG_END
version: "1.0"
model: claude-3-opus-20240229
temperature: 0.7
max_tokens: 4096

project:
  name: $PROJECT_NAME
  type: $PROJECT_TYPE
  language: $LANGUAGE
  framework: $FRAMEWORK

context:
  - CLAUDE.md
  - .claude/context.md
  - README.md
  - src/**/*

standards:
  repository: https://github.com/williamzujkowski/standards
  autoload:
    - UNIFIED_STANDARDS.md
    - CODING_STANDARDS.md
    - TESTING_STANDARDS.md
    - MODERN_SECURITY_STANDARDS.md

workflows:
  code_review:
    trigger: [pre-commit, pull_request]
    standards: [CS, TS, SEC]
CONFIG_END
    echo -e "${GREEN}✓${NC} Claude configuration created"
}

# Main execution
main() {
    clear
    print_banner
    
    # Check if running from command line args
    if [ $# -ge 3 ]; then
        PROJECT_NAME="$1"
        PROJECT_TYPE="$2"
        LANGUAGE="$3"
        FRAMEWORK="${4:-express}"
        echo -e "${BLUE}Using provided arguments...${NC}"
    else
        get_project_details
    fi
    
    create_project
    copy_templates
    create_claude_config
    
    # Initialize git
    git init
    git add .
    git commit -m "Initial commit from template generator"
    
    echo -e "\n${GREEN}${BOLD}✨ Project Created Successfully! ✨${NC}\n"
    echo -e "${CYAN}Next Steps:${NC}"
    echo "  1. cd $PROJECT_NAME"
    echo "  2. Set your Claude API key:"
    echo "     export ANTHROPIC_API_KEY='your-key-here'"
    echo "  3. Run: npm install (or appropriate command)"
    echo ""
}

# Run main function
main "$@"
SETUP_END
}

# Create setup.sh
copy_or_create "main-setup-script.sh" "setup.sh" create_setup_sh

# Function to create init-project.sh
create_init_project() {
    cat > init-project.sh << 'INIT_PROJECT_END'
#!/bin/bash
# init-project.sh - Initialize a new project from this template

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Initializing new project from template...${NC}"

# Check if setup.sh exists
if [ ! -f "setup.sh" ]; then
    echo -e "${YELLOW}Error: setup.sh not found.${NC}"
    exit 1
fi

# Run the main setup script
./setup.sh

echo -e "${GREEN}Project initialization complete!${NC}"
INIT_PROJECT_END
}

# Create init-project.sh
copy_or_create "init-project-script.sh" "init-project.sh" create_init_project

# Create README.md
echo -e "${GREEN}✓${NC} Creating README.md..."
cat > README.md << 'README_END'
# 🚀 Template Repository Generator

> AI-powered template repository generator with Claude CLI integration and williamzujkowski/standards compliance

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![Standards](https://img.shields.io/badge/standards-williamzujkowski-green.svg)](https://github.com/williamzujkowski/standards)
[![NIST Compliant](https://img.shields.io/badge/NIST-800--53r5-purple.svg)]()
[![License](https://img.shields.io/badge/license-MIT-orange.svg)]()

## 📋 Overview

This template repository provides a complete, production-ready foundation for new projects with:
- 🤖 Claude AI integration for intelligent code generation
- 📚 Automatic compliance with williamzujkowski/standards
- 🛡️ NIST 800-53r5 security controls built-in
- 🧪 Comprehensive testing infrastructure
- 📊 Full observability and monitoring
- 🚀 CI/CD pipelines ready to go

## ⚡ Quick Start

### Option 1: Interactive Setup (Recommended)
```bash
# Clone this template repository
git clone https://github.com/yourusername/template-generator.git
cd template-generator

# Run the interactive setup
./setup.sh

# Follow the prompts to configure your project
```

### Option 2: One-Command Setup
```bash
# Create a new project with defaults
./setup.sh my-project api typescript express
```

## 📁 Repository Structure

```
template-generator/
├── CLAUDE.md                 # AI development interface template
├── PROJECT_INIT.md          # Universal project initialization prompt
├── claude-swarm.yaml        # Parallel AI processing configuration
├── setup.sh                 # Main setup script
├── init-project.sh          # Project initialization wrapper
├── Makefile                 # Convenient make commands
├── .claude/
│   ├── config.yaml         # Claude CLI configuration template
│   ├── prompts/            # Custom prompt templates
│   └── workflows/          # Claude workflow definitions
├── .github/
│   └── workflows/
│       └── claude-review.yml   # AI code review workflow
├── scripts/
│   └── validate-template.sh
└── docs/
    └── SETUP.md
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by developers, for developers**
README_END

# Create .gitignore
echo -e "${GREEN}✓${NC} Creating .gitignore..."
cat > .gitignore << 'GITIGNORE_END'
# Generated projects (for testing)
test-*/
temp-*/
*-example/

# Environment variables
.env
.env.local
.env.*.local

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Logs
*.log
logs/
npm-debug.log*

# Dependencies
node_modules/
vendor/

# Build outputs
dist/
build/

# Cache
.cache/
.claude/cache/

# Temporary files
*.tmp
*.bak
*.orig

# Secrets
*.key
*.pem
*.crt
secrets/
credentials/

# Standards repository (if cloned locally)
.standards/
GITIGNORE_END

# Create .claude/config.yaml
echo -e "${GREEN}✓${NC} Creating .claude/config.yaml..."
cat > .claude/config.yaml << 'CONFIG_YAML_END'
version: "1.0"
model: claude-3-opus-20240229
temperature: 0.7
max_tokens: 4096

# Project configuration (will be replaced by setup script)
project:
  name: "{PROJECT_NAME}"
  type: "{PROJECT_TYPE}"
  language: "{PRIMARY_LANGUAGE}"
  framework: "{FRAMEWORK}"

# Context files
context:
  - CLAUDE.md
  - .claude/context.md
  - README.md
  - src/**/*
  
# Standards repository
standards:
  repository: https://github.com/williamzujkowski/standards
  autoload:
    - UNIFIED_STANDARDS.md
    - CODING_STANDARDS.md
    - TESTING_STANDARDS.md
    - MODERN_SECURITY_STANDARDS.md
    - CLOUD_NATIVE_STANDARDS.md

# Workflows
workflows:
  code_review:
    trigger: [pre-commit, pull_request]
    standards: [CS, TS, SEC]
    output: markdown
    
  generate_tests:
    coverage_target: 80
    framework: "{TEST_FRAMEWORK}"
    types: [unit, integration, e2e]
    
  security_audit:
    nist_controls: true
    vulnerability_scan: true
    schedule: weekly
    severity_threshold: medium

# Features
features:
  auto_complete: true
  real_time_validation: true
  nist_suggestions: true
  performance_monitoring: true
  self_healing: false
CONFIG_YAML_END

# Create GitHub workflow
echo -e "${GREEN}✓${NC} Creating .github/workflows/claude-review.yml..."
cat > .github/workflows/claude-review.yml << 'GH_WORKFLOW_END'
name: Claude AI Code Review

on:
  pull_request:
    types: [opened, synchronize]
    
permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  claude-review:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Claude CLI
        run: |
          npm install -g claude-cli
      
      - name: Run Claude Review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Get changed files
          git diff --name-only origin/${{ github.base_ref }}...HEAD > changed_files.txt
          
          # Run Claude review
          claude review \
            --files changed_files.txt \
            --standards "https://github.com/williamzujkowski/standards" \
            --check "security,performance,quality,standards" \
            --output review.md
      
      - name: Post Review Comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const review = fs.readFileSync('review.md', 'utf8');
            
            // Post review comment
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## 🤖 Claude AI Code Review\n\n' + review
            });
GH_WORKFLOW_END

# Create Makefile
echo -e "${GREEN}✓${NC} Creating Makefile..."
cat > Makefile << 'MAKEFILE_END'
# Makefile for Template Repository Generator

.PHONY: help new interactive validate clean

# Colors
GREEN := \033[0;32m
BLUE := \033[0;34m
NC := \033[0m

help: ## Show this help message
	@echo "$(BLUE)Template Repository Generator$(NC)"
	@echo ""
	@echo "Usage:"
	@echo "  make [command]"
	@echo ""
	@echo "Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'

new: ## Create new project (use PROJECT_NAME=name PROJECT_TYPE=type)
	@./setup.sh $(PROJECT_NAME) $(PROJECT_TYPE) $(LANGUAGE) $(FRAMEWORK)

interactive: ## Create project with interactive prompts
	@./setup.sh

validate: ## Validate template repository setup
	@./scripts/validate-template.sh

clean: ## Clean test projects
	@rm -rf test-* temp-* *-example/
	@echo "$(GREEN)✓$(NC) Test projects cleaned"

web: ## Create web application
	@./setup.sh $(PROJECT_NAME) web typescript react

api: ## Create API service
	@./setup.sh $(PROJECT_NAME) api typescript express

microservice: ## Create microservice
	@./setup.sh $(PROJECT_NAME) microservice go gin

cli: ## Create CLI tool
	@./setup.sh $(PROJECT_NAME) cli typescript commander
MAKEFILE_END

# Create validation script
echo -e "${GREEN}✓${NC} Creating scripts/validate-template.sh..."
cat > scripts/validate-template.sh << 'VALIDATE_END'
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
VALIDATE_END

# Create docs/SETUP.md
echo -e "${GREEN}✓${NC} Creating docs/SETUP.md..."
cat > docs/SETUP.md << 'DOCS_END'
# Setup Guide

## Prerequisites

- Node.js 18+ installed
- Git installed
- Bash shell available
- Claude API key (get from https://console.anthropic.com)

## Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/yourusername/template-generator.git
cd template-generator
```

2. Set environment variables:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

3. Run setup:
```bash
./setup.sh
```

## Configuration

Edit `.claude/config.yaml` to customize default settings.

## Troubleshooting

If you encounter permission errors:
```bash
chmod +x setup.sh init-project.sh scripts/*.sh
```

For more help, see the main README or open an issue on GitHub.
DOCS_END

# Create LICENSE
echo -e "${GREEN}✓${NC} Creating LICENSE..."
cat > LICENSE << 'LICENSE_END'
MIT License

Copyright (c) 2024 Template Repository Generator

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
LICENSE_END

# Make scripts executable
echo -e "${GREEN}✓${NC} Making scripts executable..."
chmod +x setup.sh init-project.sh scripts/validate-template.sh

# Initialize git repository
echo -e "${GREEN}✓${NC} Initializing git repository..."
git init
git add .
git commit -m "Initial template repository setup with Claude integration and williamzujkowski/standards"

# Run validation
echo -e "${GREEN}✓${NC} Running validation..."
./scripts/validate-template.sh

echo -e "\n${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}    ✨ Template Repository Setup Complete! ✨${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}\n"

echo -e "${CYAN}Your template repository is ready!${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Set your Claude API key:"
echo "   export ANTHROPIC_API_KEY='your-key-here'"
echo ""
echo "2. Test the template by creating a project:"
echo "   ./setup.sh test-project api typescript express"
echo ""
echo "3. Push to GitHub:"
echo "   git remote add origin https://github.com/yourusername/template-generator.git"
echo "   git push -u origin main"
echo ""
echo "4. Add GitHub Secrets in repository settings:"
echo "   - ANTHROPIC_API_KEY: Your Claude API key"
echo ""

echo -e "${CYAN}Usage Examples:${NC}"
echo "  ./setup.sh                           # Interactive mode"
echo "  ./setup.sh my-api api typescript    # Quick create"
echo "  make new PROJECT_NAME=my-app        # Using Make"
echo ""

echo -e "${BLUE}Resources:${NC}"
echo "  📚 Documentation: docs/SETUP.md"
echo "  🔧 Standards: https://github.com/williamzujkowski/standards"
echo "  🤖 Claude: https://docs.anthropic.com"
echo ""

echo -e "${GREEN}Happy coding! 🚀${NC}"