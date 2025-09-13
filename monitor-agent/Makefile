# Makefile for Rybbit Monitor Agent

.PHONY: help build dev prod test clean deploy-all status-all

# Default region
REGION ?= us-east

help: ## Show this help message
	@echo 'Usage: make [target] [REGION=region]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ''
	@echo 'Regions: us-east, us-west, europe, asia'

build: ## Build the Docker image
	docker-compose build

dev: ## Run in development mode with hot reloading
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

prod: ## Run in production mode
	REGION=$(REGION) docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

test: ## Run tests
	npm test

lint: ## Run linter
	npm run lint

clean: ## Clean up containers and images
	docker-compose down -v
	docker rmi rybbit-monitor-agent:latest || true

logs: ## Show logs
	docker-compose logs -f monitor-agent

shell: ## Open shell in container
	docker-compose exec monitor-agent sh

deploy: ## Deploy to a specific region
	./deploy.sh $(REGION) deploy

deploy-all: ## Deploy to all regions
	@for region in us-east us-west europe asia; do \
		echo "Deploying to $$region..."; \
		./deploy.sh $$region deploy; \
	done

status: ## Check status of a specific region
	./deploy.sh $(REGION) status

status-all: ## Check status of all regions
	@for region in us-east us-west europe asia; do \
		echo "=== Status for $$region ==="; \
		./deploy.sh $$region status; \
		echo ""; \
	done

install: ## Install dependencies
	npm install

build-ts: ## Build TypeScript
	npm run build

start: ## Start the agent locally
	npm start