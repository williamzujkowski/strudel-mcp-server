#!/bin/bash
# setup.sh - Main setup script for template repository
# Run this to initialize a new project from the template

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
    echo "6) data-pipeline - Data processing pipeline"
    read -p "Choice (1-6): " type_choice
    
    case $type_choice in
        1) PROJECT_TYPE="web" ;;
        2) PROJECT_TYPE="api" ;;
        3) PROJECT_TYPE="cli" ;;
        4) PROJECT_TYPE="library" ;;
        5) PROJECT_TYPE="microservice" ;;
        6) PROJECT_TYPE="data-pipeline" ;;
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
    
    # Framework (based on type and language)
    select_framework
}

# Select framework based on project type and language
select_framework() {
    echo -e "\n${CYAN}Select framework:${NC}"
    
    if [[ "$PROJECT_TYPE" == "web" && "$LANGUAGE" == "typescript" ]]; then
        echo "1) react    - Facebook's UI library"
        echo "2) nextjs   - Full-stack React framework"
        echo "3) vue      - Progressive framework"
        echo "4) angular  - Google's framework"
        read -p "Choice (1-4): " fw_choice
        case $fw_choice in
            1) FRAMEWORK="react" ;;
            2) FRAMEWORK="nextjs" ;;
            3) FRAMEWORK="vue" ;;
            4) FRAMEWORK="angular" ;;
            *) FRAMEWORK="react" ;;
        esac
    elif [[ "$PROJECT_TYPE" == "api" && "$LANGUAGE" == "typescript" ]]; then
        echo "1) express  - Fast, minimalist"
        echo "2) nestjs   - Enterprise-grade"
        echo "3) fastify  - High performance"
        read -p "Choice (1-3): " fw_choice
        case $fw_choice in
            1) FRAMEWORK="express" ;;
            2) FRAMEWORK="nestjs" ;;
            3) FRAMEWORK="fastify" ;;
            *) FRAMEWORK="express" ;;
        esac
    elif [[ "$PROJECT_TYPE" == "api" && "$LANGUAGE" == "python" ]]; then
        echo "1) fastapi  - Modern, fast"
        echo "2) django   - Batteries included"
        echo "3) flask    - Minimalist"
        read -p "Choice (1-3): " fw_choice
        case $fw_choice in
            1) FRAMEWORK="fastapi" ;;
            2) FRAMEWORK="django" ;;
            3) FRAMEWORK="flask" ;;
            *) FRAMEWORK="fastapi" ;;
        esac
    elif [[ "$LANGUAGE" == "go" ]]; then
        echo "1) gin      - HTTP web framework"
        echo "2) echo     - High performance"
        echo "3) fiber    - Express-inspired"
        read -p "Choice (1-3): " fw_choice
        case $fw_choice in
            1) FRAMEWORK="gin" ;;
            2) FRAMEWORK="echo" ;;
            3) FRAMEWORK="fiber" ;;
            *) FRAMEWORK="gin" ;;
        esac
    else
        FRAMEWORK="default"
    fi
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

# Copy template files
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
    
    # Copy claude-swarm.yaml if it exists
    if [ -f ../claude-swarm.yaml ]; then
        cp ../claude-swarm.yaml .claude/swarm.yaml
        echo -e "${GREEN}✓${NC} Claude swarm configuration copied"
    fi
    
    # Copy PROJECT_INIT.md if it exists
    if [ -f ../PROJECT_INIT.md ]; then
        cp ../PROJECT_INIT.md .claude/PROJECT_INIT.md
        echo -e "${GREEN}✓${NC} Project initialization prompt copied"
    fi
}

# Create .claude/config.yaml
create_claude_config() {
    cat > .claude/config.yaml << EOF
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
    
  generate_tests:
    coverage_target: 80
    framework: jest
    
  security_audit:
    nist_controls: true
    vulnerability_scan: true
EOF
    echo -e "${GREEN}✓${NC} Claude configuration created"
}

# Create GitHub workflows
create_workflows() {
    # CI workflow
    cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run lint
EOF
    
    # Security workflow
    cat > .github/workflows/security.yml << 'EOF'
name: Security

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * MON'

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: security-report
          path: security-report.json
EOF
    echo -e "${GREEN}✓${NC} GitHub workflows created"
}

# Create README
create_readme() {
    cat > README.md << EOF
# $PROJECT_NAME

> $PROJECT_TYPE application built with $LANGUAGE and $FRAMEWORK

[![Standards](https://img.shields.io/badge/standards-williamzujkowski-blue)](https://github.com/williamzujkowski/standards)
[![NIST](https://img.shields.io/badge/NIST-800--53r5-green)]()

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Run development
npm run dev

# Run tests
npm test
\`\`\`

## 📚 Documentation

- [CLAUDE.md](./CLAUDE.md) - AI development interface
- [Architecture](./docs/architecture.md) - System design
- [API](./docs/api.md) - API documentation

## 🛡️ Security

This project implements NIST 800-53r5 security controls. See [SECURITY.md](./SECURITY.md) for details.

## 📝 License

MIT

---

Generated with [Template Repository Generator](https://github.com/yourusername/template-generator)
EOF
    echo -e "${GREEN}✓${NC} README created"
}

# Create package.json for Node projects
create_package_json() {
    if [[ "$LANGUAGE" == "typescript" || "$LANGUAGE" == "javascript" ]]; then
        cat > package.json << EOF
{
  "name": "$PROJECT_NAME",
  "version": "1.0.0",
  "description": "$PROJECT_TYPE application",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src"
  },
  "keywords": ["$PROJECT_TYPE", "$FRAMEWORK"],
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0",
    "nodemon": "^3.0.0"
  }
}
EOF
        echo -e "${GREEN}✓${NC} package.json created"
    fi
}

# Initialize git
init_git() {
    git init
    git add .
    git commit -m "Initial commit from template generator"
    echo -e "${GREEN}✓${NC} Git repository initialized"
}

# Final summary
print_summary() {
    echo -e "\n${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}        ✨ Project Created Successfully! ✨${NC}"
    echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════${NC}\n"
    
    echo -e "${CYAN}Project Details:${NC}"
    echo "  Name:      $PROJECT_NAME"
    echo "  Type:      $PROJECT_TYPE"
    echo "  Language:  $LANGUAGE"
    echo "  Framework: $FRAMEWORK"
    echo ""
    
    echo -e "${CYAN}Next Steps:${NC}"
    echo "  1. cd $PROJECT_NAME"
    echo "  2. Set your Claude API key:"
    echo "     export ANTHROPIC_API_KEY='your-key-here'"
    
    if [[ "$LANGUAGE" == "typescript" || "$LANGUAGE" == "javascript" ]]; then
        echo "  3. Install dependencies:"
        echo "     npm install"
    elif [[ "$LANGUAGE" == "python" ]]; then
        echo "  3. Create virtual environment:"
        echo "     python -m venv venv"
        echo "     source venv/bin/activate"
    fi
    
    echo "  4. Start development:"
    echo "     npm run dev  # or appropriate command"
    echo ""
    
    echo -e "${YELLOW}Resources:${NC}"
    echo "  📚 CLAUDE.md - AI development interface"
    echo "  🔧 .claude/config.yaml - Claude configuration"
    echo "  📖 README.md - Project documentation"
    echo ""
}

# Main execution
main() {
    clear
    print_banner
    get_project_details
    create_project
    copy_templates
    create_claude_config
    create_workflows
    create_readme
    create_package_json
    init_git
    print_summary
}

# Run main function
main "$@"