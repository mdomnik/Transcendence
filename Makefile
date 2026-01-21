.PHONY: all up down restart logs build clean env check setup-goinfre fresh

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
	@mkdir -p ~/goinfre/.docker
	@if [ -d ~/.local/share/docker ] && [ ! -L ~/.local/share/docker ]; then \
		echo "Moving existing Docker data to goinfre..."; \
		mv ~/.local/share/docker ~/.local/share/docker_old; \
	fi
	@if [ ! -L ~/.local/share/docker ]; then \
		echo "Creating symlink..."; \
		ln -s ~/goinfre/.docker ~/.local/share/docker; \
	fi
	@echo "✓ Docker configured to use ~/goinfre/.docker"

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

install: env build up
