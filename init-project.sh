#!/bin/bash
# init-project.sh - Initialize a new project from this template
# This script should be run from the root of the template repository

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Initializing new project from template...${NC}"

# Check if setup.sh exists
if [ ! -f "setup.sh" ]; then
    echo -e "${YELLOW}Error: setup.sh not found. Make sure you're in the template repository root.${NC}"
    exit 1
fi

# Run the main setup script
./setup.sh

echo -e "${GREEN}Project initialization complete!${NC}"