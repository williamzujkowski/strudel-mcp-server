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
