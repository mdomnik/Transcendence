COMPOSE_PROD = docker compose
COMPOSE_DEV  = docker compose -f docker-compose.yml -f docker-compose.dev.yml

all: prod

init:
	$(MAKE) docker-setup-goinfre 
	$(MAKE) docker-reset
	$(MAKE) docker-purge
	$(MAKE) prod

# Production

prod: check
	$(COMPOSE_PROD) up

prod-start: check
	$(COMPOSE_PROD) down -v
	$(COMPOSE_PROD) build --no-cache
	$(COMPOSE_PROD) up

prod-up: prod
prod-down:
	$(COMPOSE_PROD) down

prod-clean:
	$(COMPOSE_PROD) down -v

prod-build:
	$(COMPOSE_PROD) build

prod-rebuild:
	$(COMPOSE_PROD) build --no-cache

prod-restart:
	$(COMPOSE_PROD) restart

prod-logs:
	$(COMPOSE_PROD) logs -f

# Development

dev: check
	$(COMPOSE_DEV) up 

dev-start: check
	$(COMPOSE_DEV) down -v
	$(COMPOSE_DEV) build --no-cache
	$(COMPOSE_DEV) up

dev-up: dev
dev-down:
	$(COMPOSE_DEV) down

dev-clean:
	$(COMPOSE_DEV) down -v

dev-build:
	$(COMPOSE_DEV) build

dev-rebuild:
	$(COMPOSE_DEV) build --no-cache

dev-restart:
	$(COMPOSE_DEV) restart

dev-logs:
	$(COMPOSE_DEV) logs -f

# Shared commands

down:
	$(COMPOSE_PROD) down

clean:
	$(COMPOSE_PROD) down -v

build:
	$(COMPOSE_PROD) build

rebuild:
	$(COMPOSE_PROD) build --no-cache

restart:
	$(COMPOSE_PROD) restart

logs:
	$(COMPOSE_PROD) logs -f

check:
	@command -v docker >/dev/null 2>&1 || (echo "ERROR: Docker is not installed" && exit 1)
	@command -v docker compose >/dev/null 2>&1 || (echo "ERROR: Docker Compose is not installed" && exit 1)
	@docker info >/dev/null 2>&1 || (echo "ERROR: Docker daemon is not running" && exit 1)

# Docker maintenance

docker-purge:
	@docker stop $$(docker ps -aq) 2>/dev/null || true
	@docker rm $$(docker ps -aq) 2>/dev/null || true
	@docker rmi $$(docker images -q) 2>/dev/null || true
	@docker volume rm $$(docker volume ls -q) 2>/dev/null || true
	@docker network rm $$(docker network ls -q) 2>/dev/null || true
	@docker system prune -a --volumes -f
	@echo "✓ All Docker resources removed"

docker-reset:
	@echo "Stopping Docker and cleaning all data..."
	@systemctl --user stop docker 2>/dev/null || true
	@rm -rf ~/goinfre/.docker/* 2>/dev/null || true
	@mkdir -p ~/goinfre/.docker/tmp
	@mkdir -p ~/goinfre/.docker/containerd
	@echo "Starting Docker..."
	@systemctl --user start docker
	@sleep 5
	@echo "✓ Docker reset complete"

docker-setup-goinfre:
	@systemctl --user stop docker 2>/dev/null || true
	@mkdir -p ~/goinfre/.docker
	@mkdir -p ~/.local/share
	@if [ -d ~/.local/share/docker ] && [ ! -L ~/.local/share/docker ]; then \
		rm -rf ~/.local/share/docker_old 2>/dev/null || true; \
		mv ~/.local/share/docker ~/.local/share/docker_old; \
	fi
	@if [ -L ~/.local/share/docker ]; then \
		rm ~/.local/share/docker; \
	fi
	@ln -s ~/goinfre/.docker ~/.local/share/docker
	@mkdir -p ~/goinfre/.docker/tmp
	@systemctl --user start docker
	@echo "Docker configured to use ~/goinfre/.docker"

.PHONY: all prod dev prod-up dev-up prod-down dev-down prod-rebuild dev-rebuild logs check
