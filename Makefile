.PHONY: up up-d down restart logs ps clean psql redis-cli

up-d:
	docker compose --env-file .env.local up -d --build
up:
	docker compose --env-file .env.local up -d
down:
	docker compose --env-file .env.local down
restart:
	docker compose --env-file .env.local down && docker compose --env-file .env.local up -d
logs:
	docker compose --env-file .env.local logs -f
ps:
	docker compose ps -a
clean:
	docker compose --env-file .env.local down -v
psql:
	docker compose exec postgres psql -U dev -d urlshortener
redis-cli:
	docker compose exec redis redis-cli