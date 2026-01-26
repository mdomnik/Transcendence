
all: up

start: check
	docker compose down -v
	docker compose build --no-cache
	docker compose up

up: check
	docker compose up -d

down:
	docker compose down

clean:
	docker compose down -v

build:
	docker compose build

rebuild:
	docker compose build --no-cache

restart:
	docker compose restart

logs:
	docker compose logs -f

check:
	@command -v docker >/dev/null 2>&1 || (echo "ERROR: Docker is not installed" && exit 1)
	@command -v docker compose >/dev/null 2>&1 || (echo "ERROR: Docker Compose is not installed" && exit 1)
	@docker info >/dev/null 2>&1 || (echo "ERROR: Docker daemon is not running" && exit 1)

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
	@sudo systemctl stop docker 2>/dev/null || true
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

.PHONY: all up down restart logs build clean env check setup-goinfre fresh purge docker-reset