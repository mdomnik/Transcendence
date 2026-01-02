.PHONY: up pull-llm down logs

OLLAMA_CONTAINER=llm_ollama
MODEL=llama3.1

up:
	docker compose up -d
	$(MAKE) pull-llm

pull-llm:
	docker exec -it $(OLLAMA_CONTAINER) ollama pull $(MODEL)

down:
	docker compose down

logs:
	docker compose logs -f
