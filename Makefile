.PHONY: all up down restart logs build clean env check setup-goinfre fresh purge docker-reset

all: up

fresh: check
	docker compose down -v
	docker compose build --no-cache
	docker compose up

check:
	@command -v docker >/dev/null 2>&1 || (echo "ERROR: Docker is not installed" && exit 1)
	@command -v docker compose >/dev/null 2>&1 || (echo "ERROR: Docker Compose is not installed" && exit 1)
	@docker info >/dev/null 2>&1 || (echo "ERROR: Docker daemon is not running" && exit 1)

setup-goinfre:
	@echo "Setting up Docker to use goinfre directory (for school PCs with limited home space)..."
	@echo "Stopping Docker daemon..."
	@sudo systemctl stop docker 2>/dev/null || true
	@mkdir -p ~/goinfre/.docker
	@mkdir -p ~/.local/share
	@if [ -d ~/.local/share/docker ] && [ ! -L ~/.local/share/docker ]; then \
		echo "Backing up existing Docker data..."; \
		rm -rf ~/.local/share/docker_old 2>/dev/null || true; \
		mv ~/.local/share/docker ~/.local/share/docker_old; \
	fi
	@if [ -L ~/.local/share/docker ]; then \
		echo "Removing old symlink..."; \
		rm ~/.local/share/docker; \
	fi
	@echo "Creating symlink..."
	@ln -s ~/goinfre/.docker ~/.local/share/docker
	@mkdir -p ~/goinfre/.docker/tmp
	@echo "Restarting Docker daemon..."
	@systemctl --user start docker
	@echo "✓ Docker configured to use ~/goinfre/.docker"
	@echo "✓ Run 'make purge' if you want to clean all Docker data"

env:
	@[ -f .env ] || cp .env.example .env

up: check env
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

build:
	docker compose build

rebuild:
	docker compose build --no-cache

clean:
	docker compose down -v

purge:
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

install: env build 
upinstall: env build up
