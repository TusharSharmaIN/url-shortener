# URL Shortener + Analytics

A URL shortener built to explore backend system design: encoding strategy, cache-aside reads, async event-driven analytics, crash recovery, distributed rate limiting, and a head-to-head comparison of Redis Streams vs Kafka for the same job.

## Architecture

```text
Client -> POST /shorten -> NestJS API -> Postgres (insert + Base62 encode id)
Client -> GET /:code    -> NestJS API -> Redis cache (hit/miss) -> Postgres fallback -> 302 redirect
                                       -> fire-and-forget click event -> Redis Stream / Kafka topic
                                                                              |
                                                                    Worker (consumer) -> batch insert -> Postgres clicks table
```

**Redirect never blocks on analytics** — click events are pushed asynchronously; a slow/failed analytics write can never slow down or break a redirect.

## Stack

- **API**: NestJS (TypeScript)
- **Worker**: plain Node/TypeScript (no framework — kept deliberately lightweight)
- **DB**: PostgreSQL (via TypeORM)
- **Cache**: Redis (cache-aside pattern, TTL-bound)
- **Event queue**: Redis Streams *or* Kafka — switchable via `ANALYTICS_TRANSPORT` env var
- **Rate limiting**: Redis-backed, fixed-window or sliding-window — switchable via `RATE_LIMIT_ALGORITHM`
- **Containerization**: Docker Compose, healthcheck-gated startup ordering

## Key design decisions

- **Short codes**: Base62-encoded Postgres auto-increment ID (not hash + collision retry) — deterministic, collision-free by construction, avoids birthday-paradox math entirely.
- **Cache-aside, not write-through**: reads check Redis first, fall back to Postgres on miss, populate cache with a TTL.
- **At-least-once delivery**: both the Redis Streams worker and Kafka worker only acknowledge/commit *after* a successful Postgres write — if either crashes mid-batch, unprocessed events are recovered on restart, not lost.
- **Redis Streams vs Kafka**: same reliability guarantee (process-then-acknowledge), different mechanism (per-message ack vs per-partition offset commit). Kafka needs its own broker process and is the heavier, more horizontally-scalable option; Redis Streams reuses infrastructure you likely already have.
- **Rate limiting**: fixed-window (Redis `INCR`+`EXPIRE`, O(1) memory, boundary-burst prone) vs sliding-window (Redis sorted set, accurate, memory scales with request volume).

## Project structure

```
url-shortener/
├── api/                  NestJS app (controllers, services, feature modules)
│   └── src/
│       ├── urls/          shorten + redirect + stats
│       ├── rate-limit/     fixed/sliding window guard
│       ├── redis/          Redis client provider
│       └── kafka/          Kafka producer provider
├── worker/                plain TS consumer (Redis Streams or Kafka, env-switchable)
├── docker-compose.yml     postgres, redis, kafka, api, worker
├── Makefile               up / down / logs / psql / redis-cli shortcuts
└── .env                   shared local config (gitignored)
```

## Running locally

```bash
cp .env.example .env   # fill in values
make up                 # postgres + redis only, for local dev without docker for api/worker
make build_up            # full stack — postgres, redis, kafka, api, worker
make ps
make logs
```

API available at `http://localhost:3000`.

| Endpoint | Description |
|---|---|
| `POST /shorten` | `{ "longUrl": "..." }` -> creates a short code |
| `GET /:code` | 302 redirect to the original URL |
| `GET /stats/:code` | Click count for a short code |
| `GET /health` | Liveness check |

## Environment variables

| Variable | Example | Notes |
|---|---|---|
| `POSTGRES_HOST/PORT/USER/PASSWORD/DB` | `postgres` in Compose, `localhost` outside | service name inside Docker's network |
| `REDIS_HOST/PORT` | `redis` in Compose, `localhost` outside | same rule |
| `KAFKA_BROKER` | `kafka:9092` | only needed when `ANALYTICS_TRANSPORT=kafka` |
| `ANALYTICS_TRANSPORT` | `redis` \| `kafka` | switches the click-event pipeline |
| `RATE_LIMIT_ALGORITHM` | `fixed` \| `sliding` | switches the rate-limit strategy |
| `RATE_LIMIT_LIMIT` / `RATE_LIMIT_WINDOW_SECONDS` | `5` / `60` | requests per window |

## What I'd change for production

- Real migrations instead of TypeORM `synchronize: true`
- Move the `INSERT` on shorten from two round-trips to one (using `nextval()` upfront instead of insert-then-update)
- Key rate limiting by API key/user, not just IP
- Metrics/tracing (this project stopped at structured logs)
- Drop Kafka from any low-resource deployment — Redis Streams alone is the pragmatic choice at this scale