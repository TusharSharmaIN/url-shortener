.PHONY: up down restart logs ps clean psql redis-cli

build_up:
	docker compose up -d --build
up:
	docker compose up -d
down:
	docker compose down
restart:
	docker compose down && docker compose up -d
logs:
	docker compose logs -f
ps:
	docker compose ps -a
clean:
	docker compose down -v
psql:
	docker compose exec postgres psql -U dev -d urlshortener
redis-cli:
	docker compose exec redis redis-cli